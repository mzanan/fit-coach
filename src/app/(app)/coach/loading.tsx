import { Skeleton } from "@/components/ui/Skeleton";

export default function CoachLoading() {
  return (
    <div className="mx-auto w-full max-w-(--container-focus) px-gutter">
      <div className="space-y-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
