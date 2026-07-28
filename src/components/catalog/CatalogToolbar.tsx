import type { QualityFilter } from "@/components/catalog/useCatalogFilter";
import { SearchField } from "@/components/ui/SearchField";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/utils";

const QUALITY_OPTIONS: { value: QualityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "clean", label: "Clean" },
  { value: "oily", label: "Oily" },
];

export function CatalogToolbar({
  query,
  onQueryChange,
  quality,
  onQualityChange,
  className,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  quality: QualityFilter;
  onQualityChange: (value: QualityFilter) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5 md:space-y-3", className)}>
      <SearchField
        value={query}
        onChange={onQueryChange}
        placeholder="Search meals or places"
        aria-label="Search catalog"
      />
      <Segmented
        size="lg"
        ariaLabel="Filter by fat quality"
        options={QUALITY_OPTIONS}
        value={quality}
        onChange={(v) => onQualityChange(v as QualityFilter)}
        className="md:max-w-xs"
      />
    </div>
  );
}
