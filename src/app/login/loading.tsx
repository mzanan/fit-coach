import { Skeleton } from "@/components/ui/Skeleton";

export default function LoginLoading() {
  return (
    <main className="flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="flex-[1.4] min-h-16 md:flex-1" />

        <div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-2.5 h-9 w-40" />
        </div>

        <div className="mt-block">
          <Skeleton className="h-13 w-full rounded-full" />
          <Skeleton className="mt-tight h-11 w-full rounded-full" />
        </div>

        <div className="flex-1" />
      </div>
    </main>
  );
}
