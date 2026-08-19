import "server-only";

import { after } from "next/server";
import webPush from "web-push";

import type { CoachResult } from "@/lib/ai/coach";
import {
  deleteSubscriptionByEndpoint,
  getSubscriptionsForUser,
} from "@/lib/data/pushSubscriptions";

export interface PushPayload {
  title: string;
  body: string;
}

let configured = false;

function ensureConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  if (!configured) {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;

  const subscriptions = await getSubscriptionsForUser(userId);
  if (!subscriptions.length) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode =
          err instanceof Error && "statusCode" in err
            ? (err as Error & { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscriptionByEndpoint(sub.endpoint).catch(() => {});
          return;
        }
        console.error(
          "push: sendNotification failed",
          err instanceof Error ? err.message : err,
        );
      }
    }),
  );
}

export function notifyGeneratedReply(userId: string, result: CoachResult): void {
  if (result.status !== "answered") return;
  if (!result.generated || result.stopped || !result.text.trim()) return;
  after(() =>
    sendPushToUser(userId, {
      title: "Coach",
      body: result.text.slice(0, 200),
    }),
  );
}
