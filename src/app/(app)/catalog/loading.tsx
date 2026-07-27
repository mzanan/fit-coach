import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function CatalogLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-24" />
      <Surface className="divide-y divide-border px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="py-3">
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </Surface>
    </div>
  );
}
