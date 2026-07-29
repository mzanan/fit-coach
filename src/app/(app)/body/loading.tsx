import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";
import { TwoColumnSection } from "@/components/ui/TwoColumnSection";

export default function BodyLoading() {
  return (
    <div className="mx-auto w-full max-w-(--container-default) px-gutter lg:max-w-(--container-wide)">
      <div className="space-y-7">
        <div>
          <Skeleton className="h-7 w-16" />
          <Skeleton className="mt-1.5 h-4 w-40" />
        </div>

        <TwoColumnSection
          gap={6}
          stackGap={3}
          leftSpan={7}
          left={
            <Surface level="raised" className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-9 w-32" />
            </Surface>
          }
          rightSpan={5}
          right={
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Surface key={i} className="p-4">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-1.5 h-5 w-14" />
                </Surface>
              ))}
            </div>
          }
        />

        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
