import { NextResponse } from "next/server";

import { coachReply } from "@/lib/ai/coach";
import { coachNdjsonResponse } from "@/lib/coachStream";
import { ensureProfile } from "@/lib/profile";
import { getUser } from "@/lib/session";

export const maxDuration = 300;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let question: string | undefined;
  let summary = false;
  try {
    const body = (await request.json()) as {
      question?: string;
      summary?: boolean;
    };
    question = body.question;
    summary = body.summary === true;
  } catch {
    question = undefined;
  }

  const profile = await ensureProfile(user.id);

  return coachNdjsonResponse((send) =>
    coachReply(user.id, profile, question, send, summary),
  );
}
