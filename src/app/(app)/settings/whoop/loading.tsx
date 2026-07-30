import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function WhoopLoading() {
  return (
    <div className="mx-auto w-full max-w-(--container-default) px-gutter">
      <div className="space-y-block">
        <div className="flex items-start gap-1">
          <Skeleton className="size-11 rounded-control" />
          <div className="pt-1.5">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="mt-1.5 h-4 w-56" />
          </div>
        </div>
        <Surface className="p-card">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
        </Surface>
        <Skeleton className="mt-card h-11 w-full" />
      </div>
    </div>
  );
}
