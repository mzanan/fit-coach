import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function BodyLoading() {
  return (
    <div className="mx-auto w-full max-w-(--container-wide) px-gutter">
      <div className="space-y-7">
        <div>
          <Skeleton className="h-7 w-16" />
          <Skeleton className="mt-1.5 h-4 w-40" />
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
          <Surface level="raised" className="p-5 lg:col-span-7">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-9 w-32" />
          </Surface>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:col-span-5 lg:mt-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <Surface key={i} className="p-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-1.5 h-5 w-14" />
              </Surface>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
