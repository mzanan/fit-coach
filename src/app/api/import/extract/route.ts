import { NextResponse } from "next/server";
import { getRun, start } from "workflow/api";

import { userModelRef } from "@/lib/ai/aiCredentials";
import { usableSources } from "@/lib/ai/mdExtraction";
import { mdImportWorkflow, NO_CREDENTIAL } from "@/lib/ai/mdImportWorkflow";
import {
  createImportRun,
  deleteImportRun,
  latestImportRun,
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

  if (!(await userModelRef(user.id))) {
    return NextResponse.json({ error: NO_CREDENTIAL }, { status: 400 });
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
  return NextResponse.json({ runId: run.runId });
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
