import { Skeleton } from "@/components/ui/Skeleton";

export default function ImportLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-1.5 h-4 w-72" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
