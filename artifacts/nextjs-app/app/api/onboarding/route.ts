import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { onboardingProgressTable } from "@/lib/schema";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { ONBOARDING_BY_ROLE } from "@/lib/help-defaults";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const role = user.primaryRole || "GENERAL";
    const steps = ONBOARDING_BY_ROLE[role] || [];
    const [progress] = await db
      .select()
      .from(onboardingProgressTable)
      .where(and(eq(onboardingProgressTable.userId, user.id), eq(onboardingProgressTable.role, role)))
      .limit(1);
    const checklist = progress ? JSON.parse(progress.checklist || "{}") : {};
    return NextResponse.json({
      role,
      steps,
      checklist,
      completionPct: progress?.completionPct ?? 0,
      skipped: progress?.skipped ?? false,
      currentStep: progress?.currentStep ?? steps[0]?.id ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const role = user.primaryRole || "GENERAL";
    const steps = ONBOARDING_BY_ROLE[role] || [];
    const parsed = z
      .object({
        stepId: z.string().max(64).optional(),
        done: z.boolean().optional(),
        skip: z.boolean().optional(),
        currentStep: z.string().max(64).optional(),
      })
      .safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    let [progress] = await db
      .select()
      .from(onboardingProgressTable)
      .where(and(eq(onboardingProgressTable.userId, user.id), eq(onboardingProgressTable.role, role)))
      .limit(1);

    const checklist: Record<string, boolean> = progress ? JSON.parse(progress.checklist || "{}") : {};
    if (parsed.data.stepId) checklist[parsed.data.stepId] = !!parsed.data.done;
    const doneCount = steps.filter((s) => checklist[s.id]).length;
    const completionPct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
    const skipped = parsed.data.skip ?? progress?.skipped ?? false;
    const completedAt = completionPct >= 100 ? new Date() : null;

    if (progress) {
      [progress] = await db
        .update(onboardingProgressTable)
        .set({
          checklist: JSON.stringify(checklist),
          completionPct,
          skipped,
          currentStep: parsed.data.currentStep ?? progress.currentStep,
          completedAt,
          updatedAt: new Date(),
        })
        .where(eq(onboardingProgressTable.id, progress.id))
        .returning();
    } else {
      [progress] = await db
        .insert(onboardingProgressTable)
        .values({
          userId: user.id,
          role,
          checklist: JSON.stringify(checklist),
          completionPct,
          skipped,
          currentStep: parsed.data.currentStep ?? steps[0]?.id ?? null,
          completedAt,
        })
        .returning();
    }

    return NextResponse.json({
      role,
      steps,
      checklist,
      completionPct: progress.completionPct,
      skipped: progress.skipped,
      currentStep: progress.currentStep,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
