import crypto from "crypto";
import {
  db,
  transactionsTable,
  transactionStatusHistoryTable,
  paymentWebhookEventsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

export type CheckoutSession = {
  sessionId: string;
  checkoutUrl: string;
  provider: string;
  transactionId: number;
};

export type PaymentGateway = {
  name: string;
  createCheckoutSession(input: {
    transactionId: number;
    amount: number;
    currency: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutSession>;
  verifyWebhookSignature(payload: string, signature: string | undefined, secret: string): boolean;
  parseWebhookEvent(payload: unknown): {
    eventId: string;
    eventType: string;
    sessionId?: string;
    providerReference?: string;
    status: "PAID" | "FAILED" | "REFUNDED" | "PENDING";
    transactionId?: number;
  };
  createRefund(input: { providerReference: string; amount: number; currency: string }): Promise<{ refundId: string }>;
};

/** Mock / stub gateway for MVP — swap implementation without changing callers */
export class MockPaymentGateway implements PaymentGateway {
  name = "mock";

  async createCheckoutSession(input: {
    transactionId: number;
    amount: number;
    currency: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<CheckoutSession> {
    const sessionId = `cs_mock_${crypto.randomBytes(12).toString("hex")}`;
    const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const success = encodeURIComponent(input.successUrl || `${base}/payments/success?txn=${input.transactionId}`);
    const cancel = encodeURIComponent(input.cancelUrl || `${base}/payments/cancel?txn=${input.transactionId}`);
    return {
      sessionId,
      checkoutUrl: `${base}/api/payments/mock-checkout?session=${sessionId}&txn=${input.transactionId}&success=${success}&cancel=${cancel}`,
      provider: this.name,
      transactionId: input.transactionId,
    };
  }

  verifyWebhookSignature(payload: string, signature: string | undefined, secret: string): boolean {
    if (!signature) return false;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  parseWebhookEvent(payload: unknown) {
    const body = payload as Record<string, unknown>;
    return {
      eventId: String(body.eventId || body.id || crypto.randomUUID()),
      eventType: String(body.eventType || body.type || "payment.updated"),
      sessionId: body.sessionId ? String(body.sessionId) : undefined,
      providerReference: body.providerReference ? String(body.providerReference) : undefined,
      status: (String(body.status || "PAID").toUpperCase() as "PAID" | "FAILED" | "REFUNDED" | "PENDING"),
      transactionId: body.transactionId ? Number(body.transactionId) : undefined,
    };
  }

  async createRefund(input: { providerReference: string; amount: number; currency: string }) {
    return { refundId: `rf_mock_${crypto.randomBytes(8).toString("hex")}` };
  }
}

let gatewaySingleton: PaymentGateway | null = null;

export function getPaymentGateway(): PaymentGateway {
  if (!gatewaySingleton) {
    const provider = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
    // Future: if (provider === "stripe") return new StripePaymentGateway(...)
    gatewaySingleton = new MockPaymentGateway();
    void provider;
  }
  return gatewaySingleton;
}

export function generateReceipt(txn: typeof transactionsTable.$inferSelect) {
  const lines = [
    "X!Y — Payment Receipt",
    "====================",
    `Transaction ID: ${txn.id}`,
    `Booking ID: ${txn.bookingId ?? "N/A"}`,
    `Amount: ${txn.currency} ${txn.amount}`,
    `Tax: ${txn.currency} ${txn.taxAmount ?? "0"}`,
    `Commission: ${txn.currency} ${txn.commissionAmount ?? "0"}`,
    `Platform Fee: ${txn.currency} ${txn.platformFee ?? "0"}`,
    `Date: ${txn.transactionDate.toISOString()}`,
    `Reference: ${txn.referenceNumber ?? txn.paymentProviderReference ?? "N/A"}`,
    `Status: ${txn.status}`,
  ];
  return lines.join("\n");
}

export function generateInvoice(txn: typeof transactionsTable.$inferSelect) {
  return [
    "X!Y — Invoice",
    `Invoice for transaction #${txn.id}`,
    `Bill to user #${txn.payerUserId}`,
    `Payee #${txn.payeeUserId ?? "platform"}`,
    `Subtotal: ${txn.currency} ${txn.amount}`,
    `Tax: ${txn.currency} ${txn.taxAmount ?? "0"}`,
    `Total due: ${txn.currency} ${txn.amount}`,
    `Status: ${txn.status}`,
  ].join("\n");
}

export async function recordStatusChange(params: {
  transactionId: number;
  fromStatus: string | null;
  toStatus: string;
  changedBy?: number | null;
  notes?: string | null;
  source?: string;
}) {
  await db.insert(transactionStatusHistoryTable).values({
    transactionId: params.transactionId,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    changedBy: params.changedBy ?? null,
    notes: params.notes ?? null,
    source: params.source ?? "SYSTEM",
  });
}

export async function markWebhookProcessed(params: {
  provider: string;
  eventId: string;
  eventType?: string;
  payloadHash?: string;
  transactionId?: number;
}): Promise<{ duplicate: boolean }> {
  try {
    await db.insert(paymentWebhookEventsTable).values({
      provider: params.provider,
      eventId: params.eventId,
      eventType: params.eventType ?? null,
      payloadHash: params.payloadHash ?? null,
      transactionId: params.transactionId ?? null,
    });
    return { duplicate: false };
  } catch {
    return { duplicate: true };
  }
}

export async function findTransactionByCheckout(sessionId: string) {
  const [txn] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.checkoutSessionId, sessionId))
    .limit(1);
  return txn ?? null;
}

export function hashPayload(payload: string) {
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function billingCycleEndDate(start: Date, cycle: string): Date | null {
  if (cycle === "LIFETIME") return null;
  const d = new Date(start);
  if (cycle === "MONTHLY") d.setMonth(d.getMonth() + 1);
  else if (cycle === "QUARTERLY") d.setMonth(d.getMonth() + 3);
  else if (cycle === "YEARLY") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}
