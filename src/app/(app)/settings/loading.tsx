import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export default function SettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-(--container-focus) px-gutter">
      <div className="space-y-block">
        <div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="mt-1.5 h-4 w-48" />
        </div>
        <div>
          <Skeleton className="mb-2.5 h-3 w-10" />
          <Surface radius="xl" className="h-28" />
        </div>
        <div>
          <Skeleton className="mb-2.5 h-3 w-10" />
          <Surface radius="xl" className="h-56" />
        </div>
        <Surface radius="xl" className="h-14" />
      </div>
    </div>
  );
}
