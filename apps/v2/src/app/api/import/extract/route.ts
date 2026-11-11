import { NextResponse } from "next/server";
import { getRun, start } from "workflow/api";

import { userModelRef } from "@/lib/ai/aiCredentials";
import { sourcesBytes, usableSources } from "@/lib/ai/mdExtraction";
import {
  IMPORT_ALREADY_RUNNING,
  IMPORT_MAX_BYTES,
  IMPORT_TOO_LARGE,
} from "@/lib/constants";
import { mdImportWorkflow, NO_CREDENTIAL } from "@/lib/ai/mdImportWorkflow";
import {
  createImportRun,
  deleteImportRun,
  latestImportRun,
  otherImportRuns,
  pruneImportRuns,
} from "@/lib/data/importRuns";
import { requireApiUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const sources = usableSources((body as { sources?: unknown })?.sources);
  if (!sources.length) {
    return NextResponse.json({ error: "Nothing to import" }, { status: 400 });
  }

  if (sourcesBytes(sources) > IMPORT_MAX_BYTES) {
    return NextResponse.json({ error: IMPORT_TOO_LARGE }, { status: 413 });
  }

  if (!(await userModelRef(user.id))) {
    return NextResponse.json({ error: NO_CREDENTIAL }, { status: 400 });
  }

  const active = await latestImportRun(user.id);
  if (active) {
    const status = await getRun(active.runId).status.catch(() => null);
    if (status === "pending" || status === "running") {
      return NextResponse.json(
        { error: IMPORT_ALREADY_RUNNING },
        { status: 409 },
      );
    }
  }

  const run = await start(mdImportWorkflow, [{ userId: user.id, sources }]);
  try {
    await createImportRun(user.id, run.runId);
  } catch (error) {
    console.error("md import: could not record run ownership", error);
    await getRun(run.runId)
      .cancel()
      .catch((cancelError) =>
        console.error("md import: orphan run cancel failed", cancelError),
      );
    return NextResponse.json(
      { error: "Could not start the import" },
      { status: 500 },
    );
  }
  await retireOtherRuns(user.id, run.runId);
  return NextResponse.json({ runId: run.runId });
}

async function retireOtherRuns(userId: string, runId: string): Promise<void> {
  const others = await otherImportRuns(userId, runId);
  await Promise.all(
    others.map(async (other) => {
      try {
        await getRun(other).cancel();
        await deleteImportRun(userId, other);
      } catch (error) {
        console.error("md import: superseded run cancel failed", error);
      }
    }),
  );
}

export async function GET() {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;

  await pruneImportRuns(user.id);
  const row = await latestImportRun(user.id);
  if (!row) return NextResponse.json({ runId: null });

  let status: string | null = null;
  try {
    status = await getRun(row.runId).status;
  } catch (error) {
    console.error("md import: could not read run status", error);
  }

  if (status === "pending" || status === "running" || status === "completed") {
    return NextResponse.json({ runId: row.runId });
  }

  await deleteImportRun(user.id, row.runId);
  return NextResponse.json({ runId: null });
}
