import { Skeleton } from "@/components/ui/Skeleton";

export default function WorkoutLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-1.5 h-4 w-36" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
