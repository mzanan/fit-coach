import { NextResponse } from "next/server";
import { getRun, type Run } from "workflow/api";
import { WorkflowRunFailedError } from "workflow/internal/errors";

import type { MdExtraction } from "@/lib/ai/mdExtraction";
import type { ImportEvent } from "@/lib/ai/mdImportWorkflow";
import { deleteImportRun, getImportRun } from "@/lib/data/importRuns";
import { ndjsonResponse } from "@/lib/ndjson";
import { requireApiUser } from "@/lib/session";

type StreamEvent = ImportEvent | { type: "error"; message: string };

async function failureMessage(run: Run<MdExtraction>) {
  try {
    await run.returnValue;
  } catch (caught) {
    if (WorkflowRunFailedError.is(caught)) {
      const cause = caught.cause;
      return cause instanceof Error ? cause.message : String(cause);
    }
    return caught instanceof Error ? caught.message : String(caught);
  }
  return "Extraction failed";
}

export const maxDuration = 300;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;

  const { runId } = await params;
  if (!(await getImportRun(user.id, runId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get("startIndex") ?? "0");
  const startIndex =
    Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 0;
  const run = getRun<MdExtraction>(runId);

  return ndjsonResponse<StreamEvent>(async (send) => {
    try {
      if ((await run.status) === "failed") {
        send({ type: "error", message: await failureMessage(run) });
        return;
      }
      const reader = run.getReadable<ImportEvent>({ startIndex }).getReader();
      let sent = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        sent += 1;
        send(value);
      }
      if ((await run.status) === "failed") {
        send({ type: "error", message: await failureMessage(run) });
        return;
      }
      if (!sent && (await run.status) === "completed") {
        send({ type: "done", extraction: await run.returnValue });
      }
    } catch (error) {
      console.error("md import: stream failed", error);
      send({
        type: "error",
        message: error instanceof Error ? error.message : "Extraction failed",
      });
    }
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;

  const { runId } = await params;
  await deleteImportRun(user.id, runId);
  return NextResponse.json({ forgotten: true });
}
