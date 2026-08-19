"use client";

import { FileText, FileUp, Sparkles, X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Surface } from "@/components/ui/Surface";
import { Textarea } from "@/components/ui/Textarea";
import type { Attachment } from "@/components/import/useMdImport";

export function ImportForm({
  mdText,
  setMdText,
  pending,
  attachments,
  attachFiles,
  removeAttachment,
  extract,
}: {
  mdText: string;
  setMdText: (value: string) => void;
  pending: boolean;
  attachments: Attachment[];
  attachFiles: (files: File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  extract: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-card">
      <Surface className="p-card">
        <Label htmlFor="md-text">Markdown log</Label>
        <Textarea
          id="md-text"
          value={mdText}
          onChange={(e) => setMdText(e.target.value)}
          placeholder="Paste a log here, or attach .md files below. Each file is read on its own."
          rows={12}
        />
        <div className="mt-card grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="size-4" />
            Attach .md files
          </Button>
          <Button
            disabled={pending || (!mdText.trim() && !attachments.length)}
            onClick={extract}
          >
            <Sparkles className="size-4" />
            Extract
          </Button>
        </div>
        {attachments.length ? (
          <ul className="mt-card space-y-1.5">
            {attachments.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-2 rounded-control bg-well px-3 py-2"
              >
                <FileText
                  className="size-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <span className="min-w-0 flex-1 truncate text-meta">
                  {file.name}
                </span>
                <span className="shrink-0 text-meta text-muted-foreground">
                  {file.text.length.toLocaleString()} chars
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${file.name}`}
                  disabled={pending}
                  onClick={() => removeAttachment(file.id)}
                >
                  <X className="size-4" strokeWidth={1.5} />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".md,text/markdown,text/plain"
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) await attachFiles(files);
          }}
        />
      </Surface>
      <p className="text-meta text-muted-foreground">
        The AI proposes days, meals, workouts and catalog items. You review
        before anything is written.
      </p>
    </div>
  );
}
