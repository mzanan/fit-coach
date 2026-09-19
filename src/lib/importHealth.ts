import "server-only";

import { getRun } from "workflow/api";
import { WorkflowRunNotFoundError } from "workflow/internal/errors";

import {
  failProcessingImportFiles,
  failStaleImportFiles,
  latestImportActivity,
  STALE_IMPORT_MS,
} from "@/lib/data/importFiles";
import { deleteImportRun, latestImportRun } from "@/lib/data/importRuns";

const NO_RUN =
  "The import stopped before finishing and nothing is running for it now. Start it again.";
const STALE =
  "No activity from the model for over 10 minutes, so this was marked as failed. Start it again.";

function deadRunReason(status: string): string {
  if (status === "failed") return "The run failed on the server. Start it again.";
  if (status === "cancelled") return "The run was cancelled.";
  if (status === "missing") {
    return "The server lost track of this run, usually after a restart. Start it again.";
  }
  return `The run ended as "${status}" before this file finished. Start it again.`;
}

export type ImportRunState = "running" | "completed" | "none";

async function runStatus(
  runId: string,
): Promise<{ status: string | null; missing: boolean }> {
  try {
    return { status: await getRun(runId).status, missing: false };
  } catch (error) {
    console.error("md import: could not read run status", error);
    return { status: null, missing: WorkflowRunNotFoundError.is(error) };
  }
}

export async function reconcileImportRun(
  userId: string,
): Promise<{ state: ImportRunState }> {
  const row = await latestImportRun(userId);
  if (!row) {
    await failProcessingImportFiles(userId, NO_RUN);
    return { state: "none" };
  }

  const { status, missing } = await runStatus(row.runId);

  if (status === "pending" || status === "running" || status === null) {
    if (!missing) {
      const lastActivity = Math.max(
        row.createdAt.getTime(),
        (await latestImportActivity(userId)) ?? 0,
      );
      if (Date.now() - lastActivity <= STALE_IMPORT_MS) {
        return { state: "running" };
      }
    }
    await getRun(row.runId)
      .cancel()
      .catch((error) =>
        console.error("md import: stale run cancel failed", error),
      );
    await deleteImportRun(userId, row.runId);
    await failProcessingImportFiles(
      userId,
      missing ? deadRunReason("missing") : STALE,
    );
    return { state: "none" };
  }

  if (status === "completed") {
    await failStaleImportFiles(userId, STALE);
    return { state: "completed" };
  }

  await deleteImportRun(userId, row.runId);
  await failProcessingImportFiles(userId, deadRunReason(status));
  return { state: "none" };
}
