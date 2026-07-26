import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";

const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const API_BASE = "https://api.prod.whoop.com/developer/v2";
const SCOPES =
  "read:recovery read:sleep read:cycles read:workout read:body_measurement offline";
const FIRST_SYNC_DAYS = 30;
const RESYNC_OVERLAP_MS = 48 * 60 * 60 * 1000;
const MAX_PAGES = 20;

const { whoop_connections, whoop_cycles, whoop_recovery, whoop_sleep, whoop_workouts } =
  schema;

function clientId(): string {
  const id = process.env.WHOOP_CLIENT_ID;
  if (!id) throw new Error("WHOOP_CLIENT_ID is not set");
  return id;
}

function clientSecret(): string {
  const secret = process.env.WHOOP_CLIENT_SECRET;
  if (!secret) throw new Error("WHOOP_CLIENT_SECRET is not set");
  return secret;
}

export function hasWhoopEnv(): boolean {
  return Boolean(
    process.env.WHOOP_CLIENT_ID &&
      process.env.WHOOP_CLIENT_SECRET &&
      process.env.INTEGRATIONS_ENC_KEY,
  );
}

export function whoopRedirectUri(): string {
  return `${process.env.BETTER_AUTH_URL}/api/whoop/callback`;
}

export function whoopAuthorizeUrl(state: string): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", whoopRedirectUri());
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

const tokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.string().optional(),
});

async function requestToken(
  params: Record<string, string>,
): Promise<z.infer<typeof tokenResponse>> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...params,
      client_id: clientId(),
      client_secret: clientSecret(),
    }),
  });
  if (!res.ok) throw new Error(`whoop token ${res.status}`);
  return tokenResponse.parse(await res.json());
}

function aad(userId: string): string {
  return `${userId}:whoop`;
}

async function saveTokens(
  userId: string,
  tokens: z.infer<typeof tokenResponse>,
): Promise<void> {
  const now = new Date();
  const values = {
    access_token: encryptSecret(tokens.access_token, aad(userId)),
    refresh_token: encryptSecret(tokens.refresh_token, aad(userId)),
    expires_at: new Date(Date.now() + tokens.expires_in * 1000),
    scope: tokens.scope ?? null,
    updated_at: now,
  };
  await db
    .insert(whoop_connections)
    .values({ user_id: userId, ...values, created_at: now })
    .onConflictDoUpdate({ target: whoop_connections.user_id, set: values });
}

export async function connectWhoop(userId: string, code: string): Promise<void> {
  const tokens = await requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: whoopRedirectUri(),
  });
  await saveTokens(userId, tokens);
}

export async function getWhoopConnection(userId: string) {
  const rows = await db
    .select()
    .from(whoop_connections)
    .where(eq(whoop_connections.user_id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function disconnectWhoop(userId: string): Promise<void> {
  await db
    .delete(whoop_connections)
    .where(eq(whoop_connections.user_id, userId));
}

async function freshAccessToken(userId: string): Promise<string> {
  const conn = await getWhoopConnection(userId);
  if (!conn) throw new Error("Whoop is not connected");
  if (conn.expires_at.getTime() - Date.now() > 60_000) {
    return decryptSecret(conn.access_token, aad(userId));
  }
  const tokens = await requestToken({
    grant_type: "refresh_token",
    refresh_token: decryptSecret(conn.refresh_token, aad(userId)),
    scope: "offline",
  });
  await saveTokens(userId, tokens);
  return tokens.access_token;
}

const paged = z.object({
  records: z.array(z.unknown()),
  next_token: z.string().nullable().optional(),
});

async function* collection(
  userId: string,
  path: string,
  start: Date,
): AsyncGenerator<unknown> {
  const token = await freshAccessToken(userId);
  let nextToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set("limit", "25");
    url.searchParams.set("start", start.toISOString());
    if (nextToken) url.searchParams.set("nextToken", nextToken);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`whoop ${path} ${res.status}`);
    const data = paged.parse(await res.json());
    yield* data.records;
    if (!data.next_token) return;
    nextToken = data.next_token;
  }
}

const isoDate = z.coerce.date();

const cycleRecord = z.object({
  id: z.union([z.string(), z.number()]),
  start: isoDate,
  end: isoDate.nullable().optional(),
  score_state: z.string(),
  score: z
    .object({
      strain: z.number().optional(),
      kilojoule: z.number().optional(),
      average_heart_rate: z.number().optional(),
      max_heart_rate: z.number().optional(),
    })
    .nullable()
    .optional(),
});

const recoveryRecord = z.object({
  cycle_id: z.union([z.string(), z.number()]),
  sleep_id: z.union([z.string(), z.number()]).nullable().optional(),
  created_at: isoDate,
  score_state: z.string(),
  score: z
    .object({
      recovery_score: z.number().optional(),
      resting_heart_rate: z.number().optional(),
      hrv_rmssd_milli: z.number().optional(),
      spo2_percentage: z.number().nullable().optional(),
      skin_temp_celsius: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const sleepRecord = z.object({
  id: z.union([z.string(), z.number()]),
  start: isoDate,
  end: isoDate,
  nap: z.boolean(),
  score_state: z.string(),
  score: z
    .object({
      sleep_performance_percentage: z.number().nullable().optional(),
      respiratory_rate: z.number().nullable().optional(),
      stage_summary: z
        .object({
          total_in_bed_time_milli: z.number().optional(),
          total_light_sleep_time_milli: z.number().optional(),
          total_slow_wave_sleep_time_milli: z.number().optional(),
          total_rem_sleep_time_milli: z.number().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

const workoutRecord = z.object({
  id: z.union([z.string(), z.number()]),
  start: isoDate,
  end: isoDate,
  sport_name: z.string().nullable().optional(),
  score_state: z.string(),
  score: z
    .object({
      strain: z.number().optional(),
      average_heart_rate: z.number().optional(),
      distance_meter: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
});

function syncStart(conn: { last_synced_at: Date | null }): Date {
  if (conn.last_synced_at) {
    return new Date(conn.last_synced_at.getTime() - RESYNC_OVERLAP_MS);
  }
  return new Date(Date.now() - FIRST_SYNC_DAYS * 24 * 60 * 60 * 1000);
}

export interface WhoopSyncResult {
  cycles: number;
  recovery: number;
  sleep: number;
  workouts: number;
}

export async function syncWhoop(userId: string): Promise<WhoopSyncResult> {
  const conn = await getWhoopConnection(userId);
  if (!conn) throw new Error("Whoop is not connected");
  const start = syncStart(conn);
  const result: WhoopSyncResult = { cycles: 0, recovery: 0, sleep: 0, workouts: 0 };

  for await (const raw of collection(userId, "/cycle", start)) {
    const parsed = cycleRecord.safeParse(raw);
    if (!parsed.success) continue;
    const r = parsed.data;
    const values = {
      start: r.start,
      end: r.end ?? null,
      score_state: r.score_state,
      strain: r.score?.strain ?? null,
      kilojoule: r.score?.kilojoule ?? null,
      average_heart_rate: r.score?.average_heart_rate ?? null,
      max_heart_rate: r.score?.max_heart_rate ?? null,
    };
    await db
      .insert(whoop_cycles)
      .values({ id: String(r.id), user_id: userId, ...values })
      .onConflictDoUpdate({
        target: whoop_cycles.id,
        set: values,
        setWhere: eq(whoop_cycles.user_id, userId),
      });
    result.cycles++;
  }

  for await (const raw of collection(userId, "/recovery", start)) {
    const parsed = recoveryRecord.safeParse(raw);
    if (!parsed.success) continue;
    const r = parsed.data;
    const values = {
      sleep_id: r.sleep_id == null ? null : String(r.sleep_id),
      recorded_at: r.created_at,
      score_state: r.score_state,
      recovery_score: r.score?.recovery_score ?? null,
      resting_heart_rate: r.score?.resting_heart_rate ?? null,
      hrv_rmssd_milli: r.score?.hrv_rmssd_milli ?? null,
      spo2_percentage: r.score?.spo2_percentage ?? null,
      skin_temp_celsius: r.score?.skin_temp_celsius ?? null,
    };
    await db
      .insert(whoop_recovery)
      .values({ id: String(r.cycle_id), user_id: userId, ...values })
      .onConflictDoUpdate({
        target: whoop_recovery.id,
        set: values,
        setWhere: eq(whoop_recovery.user_id, userId),
      });
    result.recovery++;
  }

  for await (const raw of collection(userId, "/activity/sleep", start)) {
    const parsed = sleepRecord.safeParse(raw);
    if (!parsed.success) continue;
    const r = parsed.data;
    const stages = r.score?.stage_summary;
    const asleep =
      stages == null
        ? null
        : (stages.total_light_sleep_time_milli ?? 0) +
          (stages.total_slow_wave_sleep_time_milli ?? 0) +
          (stages.total_rem_sleep_time_milli ?? 0);
    const values = {
      start: r.start,
      end: r.end,
      nap: r.nap,
      score_state: r.score_state,
      sleep_performance_percentage: r.score?.sleep_performance_percentage ?? null,
      respiratory_rate: r.score?.respiratory_rate ?? null,
      time_in_bed_ms: stages?.total_in_bed_time_milli ?? null,
      time_asleep_ms: asleep,
    };
    await db
      .insert(whoop_sleep)
      .values({ id: String(r.id), user_id: userId, ...values })
      .onConflictDoUpdate({
        target: whoop_sleep.id,
        set: values,
        setWhere: eq(whoop_sleep.user_id, userId),
      });
    result.sleep++;
  }

  for await (const raw of collection(userId, "/activity/workout", start)) {
    const parsed = workoutRecord.safeParse(raw);
    if (!parsed.success) continue;
    const r = parsed.data;
    const values = {
      start: r.start,
      end: r.end,
      sport_name: r.sport_name ?? null,
      score_state: r.score_state,
      strain: r.score?.strain ?? null,
      average_heart_rate: r.score?.average_heart_rate ?? null,
      distance_meter: r.score?.distance_meter ?? null,
    };
    await db
      .insert(whoop_workouts)
      .values({ id: String(r.id), user_id: userId, ...values })
      .onConflictDoUpdate({
        target: whoop_workouts.id,
        set: values,
        setWhere: eq(whoop_workouts.user_id, userId),
      });
    result.workouts++;
  }

  await db
    .update(whoop_connections)
    .set({ last_synced_at: new Date(), updated_at: new Date() })
    .where(eq(whoop_connections.user_id, userId));

  return result;
}
