import { NextResponse } from "next/server";

import { coachReply } from "@/lib/ai/coach";
import { ensureProfile } from "@/lib/profile";
import { getUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let question: string | undefined;
  try {
    const body = (await request.json()) as { question?: string };
    question = body.question;
  } catch {
    question = undefined;
  }

  const profile = await ensureProfile(user.id);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      send({ type: "status", tool: "thinking" });
      try {
        const result = await coachReply(
          user.id,
          profile,
          question,
          send,
          request.signal,
        );
        send({ type: "done", text: result.text, generated: result.generated });
      } catch {
        send({ type: "error" });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
