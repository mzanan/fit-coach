import { NextResponse } from "next/server";

import { runMdExtraction, type ImportSource } from "@/lib/ai/mdExtract";
import { getUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let sources: ImportSource[] = [];
  try {
    const body = (await request.json()) as { sources?: ImportSource[] };
    sources = Array.isArray(body.sources) ? body.sources : [];
  } catch {
    sources = [];
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const extraction = await runMdExtraction(user.id, sources, (progress) =>
          send({ type: "progress", ...progress }),
        );
        send({ type: "done", extraction });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof Error ? error.message : "Extraction failed",
        });
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
