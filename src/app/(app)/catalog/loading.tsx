import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function CatalogLoading() {
  return (
    <div className="space-y-block">
      <div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-2 h-4 w-24" />
      </div>
      <Skeleton className="h-12 w-full rounded-md" />
      <Skeleton className="mt-2.5 h-11 w-full rounded-lg" />
      <Surface radius="xl" className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-card py-3.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-2 h-3.5 w-1/4" />
            <Skeleton className="mt-2.5 h-3.5 w-3/5" />
          </div>
        ))}
      </Surface>
    </div>
  );
}
