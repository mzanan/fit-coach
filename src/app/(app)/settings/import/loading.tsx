import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function ImportLoading() {
  return (
    <div className="space-y-block">
      <div className="flex items-start gap-1">
        <Skeleton className="size-11 rounded-control" />
        <div className="pt-1.5">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="mt-1.5 h-4 w-72" />
        </div>
      </div>
      <Surface className="p-card">
        <Skeleton className="h-40 w-full" />
        <div className="mt-card grid grid-cols-2 gap-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </Surface>
    </div>
  );
}
