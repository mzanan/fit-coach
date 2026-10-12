import "server-only";

import { and, asc, desc, eq, lte } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Plan } from "@/lib/db/schema";
import type { WorkoutExecutor as DbExecutor } from "@/lib/data/workouts";
import { dayConfig, shiftDay, todayLogicalDay } from "@/lib/dates";
import type { PlanInput } from "@/lib/history/schemas";
import { pickTargets, sameTargets } from "@/lib/planTargets";
import type { Targets } from "@/lib/targets";
import { newId } from "@/lib/utils";

const { plans, profiles } = schema;

export async function listPlans(userId: string): Promise<Plan[]> {
  return db
    .select()
    .from(plans)
    .where(eq(plans.user_id, userId))
    .orderBy(asc(plans.effective_from), asc(plans.created_at));
}

export async function planFor(
  userId: string,
  day: string,
  executor: DbExecutor = db,
): Promise<Plan | null> {
  const [row] = await executor
    .select()
    .from(plans)
    .where(and(eq(plans.user_id, userId), lte(plans.effective_from, day)))
    .orderBy(desc(plans.effective_from), desc(plans.created_at))
    .limit(1);
  return row ?? null;
}

async function hasPlans(executor: DbExecutor, userId: string): Promise<boolean> {
  const rows = await executor
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.user_id, userId))
    .limit(1);
  return rows.length > 0;
}

async function insertBaselinePlan(executor: DbExecutor, userId: string, effectiveFrom: string): Promise<void> {
  const [profile] = await executor.select().from(profiles).where(eq(profiles.user_id, userId)).limit(1);
  const targets = profile ? pickTargets(profile) : null;
  if (!profile || !targets) return;
  await executor.insert(plans).values({
    id: newId(),
    user_id: userId,
    effective_from: effectiveFrom,
    phase: "before plan tracking",
    kcal_delta: null,
    ...targets,
    decision: "Targets that were in place when plan tracking started.",
    reason: "Snapshot of the profile targets taken automatically at the first recorded plan.",
    review_on: null,
    created_at: new Date(),
  });
}

async function syncCurrentTargets(
  executor: DbExecutor,
  userId: string,
  today: string,
): Promise<Plan | null> {
  const current = await planFor(userId, today, executor);
  if (!current) return null;
  const [profile] = await executor.select().from(profiles).where(eq(profiles.user_id, userId)).limit(1);
  const target = pickTargets(current);
  if (profile && target && !sameTargets(pickTargets(profile), target)) {
    await executor
      .update(profiles)
      .set({ ...target, updated_at: new Date() })
      .where(eq(profiles.user_id, userId));
  }
  return current;
}

export async function savePlan(
  userId: string,
  today: string,
  input: PlanInput,
): Promise<{ plan: Plan; currentPlanId: string | null; appliedToCurrentTargets: boolean }> {
  return db.transaction(async (tx) => {
    const effectiveFrom = input.effective_from ?? today;
    if (!(await hasPlans(tx, userId))) {
      await insertBaselinePlan(tx, userId, effectiveFrom > today ? today : shiftDay(effectiveFrom, -1));
    }
    const [plan] = await tx
      .insert(plans)
      .values({
        id: newId(),
        user_id: userId,
        effective_from: effectiveFrom,
        phase: input.phase,
        kcal_delta: input.kcal_delta ?? null,
        ...input.targets,
        decision: input.decision,
        reason: input.reason,
        review_on: input.review_on ?? null,
        created_at: new Date(),
      })
      .returning();
    const current = await syncCurrentTargets(tx, userId, today);
    return {
      plan,
      currentPlanId: current?.id ?? null,
      appliedToCurrentTargets: current?.id === plan.id,
    };
  });
}

export async function recordTargetsEdit(
  executor: DbExecutor,
  userId: string,
  today: string,
  targets: Targets,
): Promise<void> {
  if (!(await hasPlans(executor, userId))) return;
  const current = await planFor(userId, today, executor);
  if (current && sameTargets(pickTargets(current), targets)) return;
  await executor.insert(plans).values({
    id: newId(),
    user_id: userId,
    effective_from: today,
    phase: current?.phase ?? "unspecified",
    kcal_delta: current?.kcal_delta ?? null,
    ...targets,
    decision: "Targets edited directly.",
    reason: "Changed in the app or through set_targets, outside a recorded phase change.",
    review_on: null,
    created_at: new Date(),
  });
}

export async function applyDuePlansFor(userId: string, today: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [profile] = await tx.select().from(profiles).where(eq(profiles.user_id, userId)).limit(1);
    const before = profile ? pickTargets(profile) : null;
    const current = await syncCurrentTargets(tx, userId, today);
    return Boolean(current && !sameTargets(before, pickTargets(current)));
  });
}

export async function applyDuePlans(): Promise<number> {
  const users = await db.selectDistinct({ userId: plans.user_id }).from(plans);
  let applied = 0;
  for (const { userId } of users) {
    const [profile] = await db.select().from(profiles).where(eq(profiles.user_id, userId)).limit(1);
    if (!profile) continue;
    if (await applyDuePlansFor(userId, todayLogicalDay(dayConfig(profile)))) applied += 1;
  }
  return applied;
}

export async function deletePlan(
  userId: string,
  id: string,
  today: string,
): Promise<{ deleted: boolean; currentPlanId: string | null }> {
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(plans)
      .where(and(eq(plans.user_id, userId), eq(plans.id, id)))
      .returning({ id: plans.id });
    const current = deleted.length ? await syncCurrentTargets(tx, userId, today) : null;
    return { deleted: deleted.length > 0, currentPlanId: current?.id ?? null };
  });
}

export async function updatePlan(
  userId: string,
  id: string,
  today: string,
  fields: Partial<PlanInput>,
): Promise<{ plan: Plan | null; currentPlanId: string | null }> {
  return db.transaction(async (tx) => {
    const { targets, ...rest } = fields;
    const [row] = await tx
      .update(plans)
      .set({ ...rest, ...(targets ?? {}) })
      .where(and(eq(plans.user_id, userId), eq(plans.id, id)))
      .returning();
    const current = row ? await syncCurrentTargets(tx, userId, today) : null;
    return { plan: row ?? null, currentPlanId: current?.id ?? null };
  });
}
