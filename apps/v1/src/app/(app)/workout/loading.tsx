import { Page } from "@/components/ui/Page";
import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function WorkoutLoading() {
  return (
    <Page>
      <PageHeaderSkeleton description />
      <div className="space-y-tight">
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
    </Page>
  );
}
