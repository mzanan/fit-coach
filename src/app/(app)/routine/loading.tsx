import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function RoutineLoading() {
  return (
    <div className="mx-auto w-full max-w-(--container-default) px-gutter">
      <div className="space-y-block">
        <div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-11 w-full rounded-control" />
        <Skeleton className="h-12 w-full rounded-control" />
        <Surface radius="xl" className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-card py-3.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="mt-2 h-3.5 w-1/3" />
            </div>
          ))}
        </Surface>
      </div>
    </div>
  );
}
