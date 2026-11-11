import { ImportFileCard } from "@/components/import/ImportFileCard";
import type { ImportFileStatus } from "@/lib/importStream";

export function ImportFileList({ files }: { files: ImportFileStatus[] }) {
  if (!files.length) return null;
  return (
    <div className="space-y-2">
      {files.map((file) => (
        <ImportFileCard key={file.name} file={file} />
      ))}
    </div>
  );
}
