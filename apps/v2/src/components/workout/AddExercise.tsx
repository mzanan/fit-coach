"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FacetBar } from "@/components/ui/FacetBar";
import { SearchField } from "@/components/ui/SearchField";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { ExerciseResultRow } from "@/components/workout/ExerciseResultRow";
import { useAddExercise } from "@/components/workout/useAddExercise";
import { useExerciseSearch } from "@/components/workout/useExerciseSearch";
import {
  EXERCISE_EQUIPMENT_FACETS,
  EXERCISE_MUSCLE_FACETS,
} from "@/lib/constants";
import { EXERCISE_MEDIA_ATTRIBUTION } from "@/lib/exercises";
import { normalizeSearch } from "@/lib/search";
import { cn } from "@/lib/utils";

const FACET_GROUPS = [
  { key: "target", label: "Muscle", options: [...EXERCISE_MUSCLE_FACETS] },
  { key: "equipment", label: "Equipment", options: [...EXERCISE_EQUIPMENT_FACETS] },
];

export function AddExercise({
  workoutId,
  existingNames,
}: {
  workoutId: string;
  existingNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const search = useExerciseSearch(open);
  const { add, isAdded, addingKey } = useAddExercise({ workoutId, existingNames });
  const sentinel = useRef<HTMLDivElement>(null);

  const query = search.query.trim();
  const hasFilters = Boolean(search.filters.target || search.filters.equipment);
  const exactItem = search.items.find(
    (item) => normalizeSearch(item.name) === normalizeSearch(query),
  );
  const showFreeEntry = query !== "" && !exactItem && search.items.length > 0;

  const { hasMore, loadMore } = search;
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <Button variant="outline" size="md" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add exercise
      </Button>

      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title="Add exercise"
        className="sm:max-w-(--spacing-dialog-wide)"
        footer={
          showFreeEntry ? (
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => add(query)}
            >
              <Plus className="size-4" />
              <span className="truncate">{`Add "${query}"`}</span>
            </Button>
          ) : undefined
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query === "") return;
            add(exactItem?.name ?? query, exactItem?.id);
          }}
          className="hairline-b sticky top-0 z-10 -mx-5 bg-card px-5 pt-1 pb-3"
        >
          <SearchField
            value={search.query}
            onChange={search.setQuery}
            placeholder="Name, muscle or equipment"
            aria-label="Search exercises"
          />
          <FacetBar
            aria-label="Filter exercises"
            className="mt-2.5"
            groups={FACET_GROUPS}
            value={search.filters}
            onChange={search.setFilter}
            onReset={search.resetFilters}
          />
        </form>

        {search.failed ? (
          <EmptyState
            size="sm"
            className="mt-4"
            title="Could not load exercises"
            body="Check your connection and try again."
            action={
              <Button variant="outline" size="md" onClick={search.retry}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            <div
              role="status"
              aria-live="polite"
              className="mt-3 mb-1 flex items-baseline justify-between"
            >
              <span className="eyebrow">
                {query === "" && !hasFilters ? "All exercises" : "Results"}
              </span>
              {search.total > 0 ? (
                <span className="num text-meta text-muted-foreground">
                  {search.total === 1 ? "1 result" : `${search.total} results`}
                </span>
              ) : null}
            </div>

            {!search.loadedOnce && search.loading ? (
              <SkeletonRows count={6} />
            ) : search.items.length === 0 ? (
              <EmptyState
                size="sm"
                title={hasFilters ? "No matches with these filters" : `No matches for "${query}"`}
                body={
                  hasFilters
                    ? "Clear the filters, search a different name, or add it as it is."
                    : "Add it as a custom exercise, or try another spelling."
                }
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {hasFilters ? (
                      <Button variant="outline" size="md" onClick={search.resetFilters}>
                        Clear filters
                      </Button>
                    ) : null}
                    {query !== "" ? (
                      <Button size="md" onClick={() => add(query)}>
                        <span className="truncate">{`Add "${query}"`}</span>
                      </Button>
                    ) : null}
                  </div>
                }
              />
            ) : (
              <>
                <ul
                  className={cn(
                    "divide-y divide-border transition-opacity duration-(--dur-fast)",
                    search.loading && "opacity-60",
                  )}
                >
                  {search.items.map((item, i) => (
                    <ExerciseResultRow
                      key={item.id}
                      exercise={item}
                      index={i}
                      added={isAdded(item.name)}
                      adding={addingKey === item.id}
                      onAdd={() => add(item.name, item.id)}
                    />
                  ))}
                </ul>

                {search.hasMore ? <div ref={sentinel} aria-hidden /> : null}
                {search.loadingMore ? <SkeletonRows count={3} /> : null}
                {!search.hasMore && search.items.length > 0 ? (
                  <p className="eyebrow py-4 text-center">End of results</p>
                ) : null}

                <p className="mt-block text-center text-eyebrow text-muted-foreground">
                  {EXERCISE_MEDIA_ATTRIBUTION}
                </p>
              </>
            )}
          </>
        )}
      </ResponsiveDialog>
    </>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="min-h-16 py-2.5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
