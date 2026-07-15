import { z } from "zod";

export const TRANSACTION_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"] as const;
export const ADMIN_STATUS_UPDATES = ["PAID", "FAILED", "REFUNDED", "CANCELLED"] as const;
export const BILLING_CYCLES = ["MONTHLY", "QUARTERLY", "YEARLY", "LIFETIME"] as const;
export const PLAN_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export const SUBSCRIPTION_STATUSES = ["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"] as const;
export const COMMISSION_TYPES = ["FLAT", "PERCENTAGE"] as const;
export const AD_PLACEMENTS = [
  "HOMEPAGE",
  "SEARCH_RESULTS",
  "CATEGORY_PAGE",
  "MANUFACTURER_LISTING",
  "VENDOR_LISTING",
  "SIDEBAR",
  "FEATURED_SECTION",
] as const;
export const AD_STATUSES = ["PENDING", "APPROVED", "REJECTED", "RUNNING", "PAUSED", "EXPIRED"] as const;

export const createTransactionBody = z.object({
  requestId: z.number().int().positive().optional().nullable(),
  bookingId: z.number().int().positive().optional().nullable(),
  payeeUserId: z.number().int().positive().optional().nullable(),
  amount: z.union([z.string(), z.number()]).refine((v) => Number(v) > 0, "Amount must be positive"),
  currency: z.string().length(3),
  paymentMethod: z.string().max(64).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  taxAmount: z.union([z.string(), z.number()]).optional().nullable(),
  platformFee: z.union([z.string(), z.number()]).optional().nullable(),
});

export const updateTransactionBody = z.object({
  notes: z.string().max(2000).optional().nullable(),
  paymentMethod: z.string().max(64).optional().nullable(),
  payeeUserId: z.number().int().positive().optional().nullable(),
});

export const adminStatusBody = z.object({
  status: z.enum(ADMIN_STATUS_UPDATES),
  adminNotes: z.string().max(2000).optional().nullable(),
});

export const adminReferenceBody = z.object({
  referenceNumber: z.string().min(3).max(128),
  adminNotes: z.string().max(2000).optional().nullable(),
});

export const adminCommissionBody = z.object({
  commissionType: z.enum(COMMISSION_TYPES),
  commissionRate: z.union([z.string(), z.number()]),
  commissionAmount: z.union([z.string(), z.number()]).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const checkoutBody = z.object({
  transactionId: z.number().int().positive().optional(),
  bookingId: z.number().int().positive().optional().nullable(),
  amount: z.union([z.string(), z.number()]).optional(),
  currency: z.string().length(3).optional(),
  payeeUserId: z.number().int().positive().optional().nullable(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const calculateCommissionBody = z.object({
  amount: z.union([z.string(), z.number()]).refine((v) => Number(v) > 0),
  userId: z.number().int().positive().optional(),
  overrideType: z.enum(COMMISSION_TYPES).optional(),
  overrideValue: z.union([z.string(), z.number()]).optional(),
});

export const createPlanBody = z.object({
  name: z.string().min(2).max(128),
  description: z.string().max(2000).optional().nullable(),
  price: z.union([z.string(), z.number()]).refine((v) => Number(v) >= 0),
  currency: z.string().length(3).optional(),
  billingCycle: z.enum(BILLING_CYCLES),
  commissionType: z.enum(COMMISSION_TYPES).optional(),
  commissionValue: z.union([z.string(), z.number()]).optional(),
  listingLimit: z.number().int().min(0).optional(),
  featuredListings: z.number().int().min(0).optional(),
  prioritySupport: z.boolean().optional(),
  adCredits: z.number().int().min(0).optional(),
  storageLimit: z.number().int().min(0).optional(),
  features: z.string().max(4000).optional().nullable(),
  isRecommended: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(PLAN_STATUSES).optional(),
});

export const updatePlanBody = createPlanBody.partial();

export const purchaseSubscriptionBody = z.object({
  planId: z.number().int().positive(),
  autoRenew: z.boolean().optional(),
});

export const createAdBody = z.object({
  title: z.string().min(2).max(255),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().max(2000).optional().nullable(),
  destinationUrl: z.string().url().max(2000),
  placement: z.enum(AD_PLACEMENTS),
  category: z.string().max(64).optional().nullable(),
  startDate: z.string().datetime().or(z.string().min(8)),
  endDate: z.string().datetime().or(z.string().min(8)),
  budget: z.union([z.string(), z.number()]).optional(),
  remainingCredits: z.number().int().min(0).optional(),
});

export const updateAdBody = createAdBody.partial();

export const rejectAdBody = z.object({
  reason: z.string().min(2).max(1000),
});
