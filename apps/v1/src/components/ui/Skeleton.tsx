import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({ description }: { description?: boolean }) {
  return (
    <div className="mb-block">
      <Skeleton className="h-7 w-28" />
      {description ? <Skeleton className="mt-1.5 h-4 w-44" /> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-overlay", className)}
    />
  );
}
