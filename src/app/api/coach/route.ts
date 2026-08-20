import { NextResponse } from "next/server";

import { coachReply } from "@/lib/ai/coach";
import { coachNdjsonResponse } from "@/lib/coachStream";
import { COACH_REQUEST_MAX_BYTES } from "@/lib/constants";
import { ensureProfile } from "@/lib/profile";
import { notifyGeneratedReply } from "@/lib/push";
import { requireApiUser } from "@/lib/session";

export const maxDuration = 300;

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;

  const raw = await request.text();
  if (new Blob([raw]).size > COACH_REQUEST_MAX_BYTES) {
    return NextResponse.json({ error: "Question too long" }, { status: 413 });
  }

  let question: string | undefined;
  let summary = false;
  try {
    const body = JSON.parse(raw) as {
      question?: string;
      summary?: boolean;
    };
    question = body.question;
    summary = body.summary === true;
  } catch {
    question = undefined;
  }

  const profile = await ensureProfile(user.id);

  return coachNdjsonResponse(
    (send) => coachReply(user.id, profile, question, send, summary),
    (result) => notifyGeneratedReply(user.id, result),
  );
}
