import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { listRequestMessages, postRequestMessage } from "@/lib/marketplace-service";
import { checkRateLimit, RATE_LIMITS, clientIpFromHeaders } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/api-errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: raw } = await ctx.params;
    const requestId = Number(raw);
    if (!Number.isFinite(requestId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const result = await listRequestMessages(requestId, user.id);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (result === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const ip = clientIpFromHeaders(req.headers);
    const rl = checkRateLimit("messaging", `${ip}:${user.id}`, RATE_LIMITS.messaging.limit, RATE_LIMITS.messaging.windowMs);
    if (!rl.allowed) return rateLimited(rl.resetAt, rl.limit, rl.remaining);

    const { id: raw } = await ctx.params;
    const requestId = Number(raw);
    if (!Number.isFinite(requestId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const parsed = z.object({ body: z.string().min(1).max(4000) }).safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    const msg = await postRequestMessage(requestId, user.id, parsed.data.body);
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json(msg, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
