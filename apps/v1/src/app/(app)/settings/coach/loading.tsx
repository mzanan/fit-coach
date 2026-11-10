import { Page } from "@/components/ui/Page";
import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function CoachSettingsLoading() {
  return (
    <Page>
      <PageHeaderSkeleton description />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </Page>
  );
}
