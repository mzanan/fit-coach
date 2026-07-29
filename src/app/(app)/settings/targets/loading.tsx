import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function TargetsLoading() {
  return (
    <div className="mx-auto w-full max-w-(--container-focus) px-gutter">
      <div className="space-y-block">
        <div className="flex items-start gap-1">
          <Skeleton className="size-11 rounded-control" />
          <div className="pt-1.5">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="mt-1.5 h-4 w-48" />
          </div>
        </div>
        <Surface className="space-y-card p-card">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-11 w-full" />
        </Surface>
      </div>
    </div>
  );
}
