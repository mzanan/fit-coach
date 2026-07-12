import { FileText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export function MdImportCard() {
  return (
    <Surface className="p-4">
      <h2 className="text-sm font-semibold">Import from Markdown</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Migrate a markdown tracking log into meals, workouts and catalog items,
        with a review step before anything is saved.
      </p>
      <Button asChild variant="outline" className="mt-3 w-full">
        <Link href="/settings/import">
          <FileText className="size-4" />
          Open importer
        </Link>
      </Button>
    </Surface>
  );
}
