import { Page } from "@/components/ui/Page";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function AiSettingsLoading() {
  return (
    <Page>
      <div className="flex items-start gap-1">
        <Skeleton className="size-11 rounded-control" />
        <div className="pt-1.5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-1.5 h-4 w-48" />
        </div>
      </div>
      <Surface className="space-y-card">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-11 w-full" />
      </Surface>
    </Page>
  );
}
