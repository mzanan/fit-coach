import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function BackupLoading() {
  return (
    <div className="space-y-block">
      <div className="flex items-start gap-1">
        <Skeleton className="size-11 rounded-md" />
        <div className="pt-1.5">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="mt-1.5 h-4 w-56" />
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <Surface key={i} className="p-card">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="mt-1 h-4 w-56" />
          <Skeleton className="mt-card h-11 w-full" />
        </Surface>
      ))}
    </div>
  );
}
