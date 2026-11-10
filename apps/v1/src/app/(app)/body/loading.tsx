import { Page } from "@/components/ui/Page";
import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function BodyLoading() {
  return (
    <Page>
      <PageHeaderSkeleton description />

      <Surface level="raised">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-9 w-32" />
      </Surface>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Surface key={i} pad="compact">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-1.5 h-5 w-14" />
          </Surface>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </Page>
  );
}
