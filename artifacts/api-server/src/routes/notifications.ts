import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router = Router();

router.get("/notifications", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.status, "UNREAD")));

  return res.status(200).json({
    unreadCount: count,
    items: rows.map((n) => ({
      id: n.id,
      category: n.category,
      eventType: n.eventType,
      title: n.title,
      description: n.description,
      relatedType: n.relatedType,
      relatedId: n.relatedId,
      status: n.status,
      createdAt: n.createdAt.toISOString(),
    })),
    page,
    limit,
  });
});

router.get("/notifications/unread-count", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.status, "UNREAD")));
  return res.status(200).json({ unreadCount: count });
});

router.post("/notifications/:id/read", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [updated] = await db
    .update(notificationsTable)
    .set({ status: "READ" })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Notification not found" });
  return res.status(200).json({ message: "Marked as read" });
});

router.post("/notifications/read-all", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  await db
    .update(notificationsTable)
    .set({ status: "READ" })
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.status, "UNREAD")));
  return res.status(200).json({ message: "All marked as read" });
});

export default router;
