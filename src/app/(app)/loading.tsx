import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function TodayLoading() {
  return (
    <div className="mx-auto w-full max-w-(--container-wide) px-gutter">
      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="space-y-7 lg:col-span-5">
          <div className="flex items-center justify-between">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="size-9 rounded-full" />
          </div>

          <Surface level="raised" className="p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-9 w-32" />
            <Skeleton className="mt-3.5 h-1.5 w-full" />
            <div className="mt-5 grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="mt-1.5 h-5 w-16" />
                  <Skeleton className="mt-2.5 h-1.5 w-full" />
                </div>
              ))}
            </div>
          </Surface>
        </div>

        <div className="mt-7 space-y-2 lg:col-span-7 lg:mt-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
