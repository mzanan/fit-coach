"use client";

import { AlertCircle, CheckCircle2, FileText } from "lucide-react";

import { Spinner } from "@/components/ui/Spinner";
import { Surface } from "@/components/ui/Surface";
import { useElapsedSeconds } from "@/hooks/useElapsedSeconds";
import { formatDateTime } from "@/lib/dates";
import {
  estimateRemainingMinutes,
  QUIET_WARNING_S,
  type ImportFileStatus,
} from "@/lib/importStream";

export function ImportFileCard({ file }: { file: ImportFileStatus }) {
  const etaMinutes = estimateRemainingMinutes(file);
  const reprocessed = file.updatedAt !== file.createdAt;
  const secondsSinceUpdate = useElapsedSeconds(
    file.updatedAt,
    file.status === "processing",
  );

  return (
    <Surface className="flex items-center gap-3 p-4">
      <FileText
        className="size-5 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body">{file.name}</p>
        <p className="text-meta text-muted-foreground">
          {file.status === "processing" &&
            `Part ${file.chunkIndex} of ${file.chunkTotal}${etaMinutes ? `, ~${etaMinutes} min left` : ""}`}
          {file.status === "done" && "Completed"}
          {file.status === "error" && (file.error ?? "Failed")}
        </p>
        {secondsSinceUpdate !== null && (
          <p
            className={
              secondsSinceUpdate > QUIET_WARNING_S
                ? "text-meta text-destructive"
                : "text-meta text-muted-foreground"
            }
          >
            {secondsSinceUpdate < 3
              ? "Working"
              : `No update for ${secondsSinceUpdate}s`}
          </p>
        )}
        {file.status === "processing" && file.error && (
          <p className="text-meta text-destructive">{file.error}</p>
        )}
        <p className="text-meta text-muted-foreground">
          Uploaded {formatDateTime(file.createdAt)}
          {reprocessed ? `, updated ${formatDateTime(file.updatedAt)}` : ""}
        </p>
      </div>
      {file.status === "processing" && <Spinner />}
      {file.status === "done" && (
        <CheckCircle2 className="size-5 shrink-0 text-brand" strokeWidth={1.5} />
      )}
      {file.status === "error" && (
        <AlertCircle
          className="size-5 shrink-0 text-destructive"
          strokeWidth={1.5}
        />
      )}
    </Surface>
  );
}
