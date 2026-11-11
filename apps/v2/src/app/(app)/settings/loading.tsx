import { Page } from "@/components/ui/Page";
import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function SettingsLoading() {
  return (
    <Page>
      <PageHeaderSkeleton description />
      <div>
        <Skeleton className="mb-2.5 h-3 w-10" />
        <Surface pad="none" className="h-28" />
      </div>
      <div>
        <Skeleton className="mb-2.5 h-3 w-10" />
        <Surface pad="none" className="h-56" />
      </div>
      <Surface pad="none" className="h-14" />
    </Page>
  );
}
