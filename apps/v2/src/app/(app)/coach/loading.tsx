import { Page } from "@/components/ui/Page";
import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function CoachLoading() {
  return (
    <Page>
      <PageHeaderSkeleton />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-11 w-full" />
    </Page>
  );
}
