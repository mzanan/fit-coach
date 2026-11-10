import { Page } from "@/components/ui/Page";
import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function RoutineLoading() {
  return (
    <Page>
      <PageHeaderSkeleton description />
      <Skeleton className="h-11 w-full rounded-control" />
      <Skeleton className="h-12 w-full rounded-control" />
      <Surface list>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-card py-3.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-2 h-3.5 w-1/3" />
          </div>
        ))}
      </Surface>
    </Page>
  );
}
