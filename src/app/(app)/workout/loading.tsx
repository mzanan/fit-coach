import { Skeleton } from "@/components/ui/Skeleton";

export default function WorkoutLoading() {
  return (
    <div className="space-y-block">
      <div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-1.5 h-4 w-44" />
      </div>
      <div className="space-y-tight">
        <Skeleton className="h-[380px] w-full rounded-xl" />
        <Skeleton className="h-[380px] w-full rounded-xl" />
      </div>
      <Skeleton className="h-[104px] w-full rounded-xl" />
    </div>
  );
}
