import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function ScanLoading() {
  return (
    <div className="space-y-block">
      <div className="flex items-start gap-1">
        <Skeleton className="size-11 rounded-control" />
        <div className="pt-1.5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-1.5 h-4 w-56" />
        </div>
      </div>
      <Surface level="sunken" className="flex flex-col items-center px-6 py-10">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="mt-3 h-5 w-40" />
        <Skeleton className="mt-1.5 h-4 w-56" />
        <Skeleton className="mt-5 h-11 w-36" />
      </Surface>
    </div>
  );
}
