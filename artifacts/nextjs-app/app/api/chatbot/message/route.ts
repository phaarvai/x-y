import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  chatbotSessionsTable,
  chatbotMessagesTable,
  supportCasesTable,
} from "@/lib/schema";
import {
  requireUser,
  isAuthUser,
  escapeHtml,
  clientIp,
  writeAuditLog,
  createNotification,
} from "@/lib/legal-auth";
import { ChatbotService } from "@/lib/chatbot-service";
import { chatbotRateOk } from "@/lib/help-api-utils";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!chatbotRateOk(`chatbot:${ip}`)) {
      return NextResponse.json({ error: "Too many chatbot requests. Please wait a moment." }, { status: 429 });
    }

    const parsed = z
      .object({
        message: z.string().min(1).max(2000),
        sessionKey: z.string().max(128).optional(),
        roleHint: z.string().max(64).optional(),
        escalate: z.boolean().optional(),
        escalateSubject: z.string().max(255).optional(),
        escalateDescription: z.string().max(5000).optional(),
      })
      .safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    let userId: number | null = null;
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (token) {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      userId = user.id;
    }

    const sessionKey = parsed.data.sessionKey || crypto.randomBytes(16).toString("hex");
    let [session] = await db
      .select()
      .from(chatbotSessionsTable)
      .where(eq(chatbotSessionsTable.sessionKey, sessionKey))
      .limit(1);
    if (!session) {
      [session] = await db
        .insert(chatbotSessionsTable)
        .values({
          sessionKey,
          userId,
          roleHint: parsed.data.roleHint ?? null,
        })
        .returning();
    }

    const reply = ChatbotService.reply(parsed.data.message, parsed.data.roleHint || session.roleHint);

    await db.insert(chatbotMessagesTable).values({
      sessionId: session.id,
      role: "user",
      content: escapeHtml(parsed.data.message),
      intent: reply.intent,
    });
    await db.insert(chatbotMessagesTable).values({
      sessionId: session.id,
      role: "assistant",
      content: reply.message,
      intent: reply.intent,
    });

    await writeAuditLog({
      actorUserId: userId,
      action: "CHATBOT_INTERACTION",
      entityType: "ChatbotSession",
      entityId: session.id,
      metadata: { intent: reply.intent },
      ipAddress: ip,
    });

    let ticket = null;
    if (parsed.data.escalate && userId) {
      const subject = escapeHtml(parsed.data.escalateSubject || "Chatbot escalation");
      const description = escapeHtml(
        parsed.data.escalateDescription || `Escalated from chatbot. Last message: ${parsed.data.message}`,
      );
      const [caseRow] = await db
        .insert(supportCasesTable)
        .values({
          userId,
          subject,
          description,
          priority: "MEDIUM",
          status: "OPEN",
        })
        .returning();
      ticket = { id: caseRow.id, subject: caseRow.subject };
      await writeAuditLog({
        actorUserId: userId,
        action: "SUPPORT_ESCALATION",
        entityType: "SupportCase",
        entityId: caseRow.id,
        ipAddress: ip,
      });
      await createNotification({
        userId,
        eventType: "SUPPORT_ESCALATION_CREATED",
        title: "Support ticket created",
        description: `Ticket #${caseRow.id} was created from Help chat.`,
        relatedType: "SupportCase",
        relatedId: caseRow.id,
        category: "ADMIN",
      });
    }

    return NextResponse.json({
      sessionKey,
      ...reply,
      ticket,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
