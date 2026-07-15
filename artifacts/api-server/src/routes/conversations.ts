import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, sessionsTable, usersTable } from "@workspace/db";
import { CreateConversationBody } from "@workspace/api-zod";
import { eq, desc, count, sql } from "drizzle-orm";

const router = Router();

async function requireUser(req: any, res: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return null;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return null;
  }
  return user;
}

router.get("/conversations", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const convs = await db
    .select({
      id: conversationsTable.id,
      title: conversationsTable.title,
      language: conversationsTable.language,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      messageCount: count(messagesTable.id),
    })
    .from(conversationsTable)
    .leftJoin(messagesTable, eq(messagesTable.conversationId, conversationsTable.id))
    .where(eq(conversationsTable.userId, user.id))
    .groupBy(conversationsTable.id)
    .orderBy(desc(conversationsTable.updatedAt));

  const conversations = convs.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    messageCount: Number(c.messageCount),
  }));

  return res.status(200).json({ conversations, total: conversations.length });
});

router.post("/conversations", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { title, language } = parsed.data;
  const [conv] = await db.insert(conversationsTable).values({
    userId: user.id,
    title,
    language: language ?? "en",
  }).returning();

  return res.status(201).json({
    id: conv.id,
    title: conv.title,
    language: conv.language,
    messageCount: 0,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  });
});

router.get("/conversations/stats", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const convs = await db
    .select({
      id: conversationsTable.id,
      language: conversationsTable.language,
      messageCount: count(messagesTable.id),
    })
    .from(conversationsTable)
    .leftJoin(messagesTable, eq(messagesTable.conversationId, conversationsTable.id))
    .where(eq(conversationsTable.userId, user.id))
    .groupBy(conversationsTable.id);

  const totalConversations = convs.length;
  const totalMessages = convs.reduce((sum, c) => sum + Number(c.messageCount), 0);
  const languagesUsed = [...new Set(convs.map(c => c.language))];

  const voiceMessages = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .leftJoin(conversationsTable, eq(conversationsTable.id, messagesTable.conversationId))
    .where(sql`${conversationsTable.userId} = ${user.id} AND ${messagesTable.isVoice} = 'true'`);

  const topQueries = await db
    .select({ content: messagesTable.content })
    .from(messagesTable)
    .leftJoin(conversationsTable, eq(conversationsTable.id, messagesTable.conversationId))
    .where(sql`${conversationsTable.userId} = ${user.id} AND ${messagesTable.role} = 'user'`)
    .limit(5)
    .orderBy(desc(messagesTable.createdAt));

  return res.status(200).json({
    totalConversations,
    totalMessages,
    languagesUsed,
    voiceQueriesCount: Number(voiceMessages[0]?.cnt ?? 0),
    topQueries: topQueries.map(q => q.content.substring(0, 80)),
  });
});

router.get("/conversations/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id))
    .limit(1);

  if (!conv || conv.userId !== user.id) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(messagesTable.createdAt);

  const msgCount = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id));

  return res.status(200).json({
    conversation: {
      id: conv.id,
      title: conv.title,
      language: conv.language,
      messageCount: Number(msgCount[0]?.cnt ?? 0),
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    },
    messages: msgs.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      isVoice: m.isVoice === "true",
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

router.delete("/conversations/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id)).limit(1);
  if (!conv || conv.userId !== user.id) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  await db.delete(messagesTable).where(eq(messagesTable.conversationId, id));
  await db.delete(conversationsTable).where(eq(conversationsTable.id, id));

  return res.status(200).json({ message: "Conversation deleted" });
});

export default router;
