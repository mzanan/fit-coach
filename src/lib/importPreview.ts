import type {
  ImportedBodyScan,
  ImportedCatalogItem,
  ImportedFact,
  ImportedMeal,
  ImportedRule,
  ImportedWorkout,
  MdExtraction,
} from "@/lib/ai/mdExtraction";

export interface PreviewMeal extends ImportedMeal {
  key: string;
  include: boolean;
}

export interface PreviewWorkout {
  workout: ImportedWorkout;
  include: boolean;
}

export interface PreviewDay {
  day: string;
  meals: PreviewMeal[];
  workout: PreviewWorkout | null;
}

export interface PreviewCatalogItem extends ImportedCatalogItem {
  key: string;
  include: boolean;
}

export interface PreviewFact extends ImportedFact {
  key: string;
  include: boolean;
}

export interface PreviewRule extends ImportedRule {
  include: boolean;
}

export interface PreviewBodyScan extends ImportedBodyScan {
  include: boolean;
}

export function withoutInclude<T extends { include: boolean }>(
  item: T,
): Omit<T, "include"> {
  return Object.fromEntries(
    Object.entries(item).filter(([key]) => key !== "include"),
  ) as Omit<T, "include">;
}

export function toPreviewDays(extraction: MdExtraction): PreviewDay[] {
  return extraction.days.map((day, dayIndex) => ({
    day: day.day,
    meals: day.meals.map((meal, mealIndex) => ({
      ...meal,
      key: `${dayIndex}-${mealIndex}`,
      include: true,
    })),
    workout: day.workout ? { workout: day.workout, include: true } : null,
  }));
}

export function toPreviewCatalogItems(
  extraction: MdExtraction,
): PreviewCatalogItem[] {
  return extraction.catalog_items.map((item, index) => ({
    ...item,
    key: `c-${index}`,
    include: true,
  }));
}

export function toPreviewFacts(extraction: MdExtraction): PreviewFact[] {
  return extraction.facts.map((fact, index) => ({
    ...fact,
    key: `f-${index}`,
    include: true,
  }));
}

export function toPreviewRules(extraction: MdExtraction): PreviewRule[] {
  return extraction.rules.map((rule) => ({ ...rule, include: true }));
}

export function toPreviewBodyScans(
  extraction: MdExtraction,
): PreviewBodyScan[] {
  return extraction.body_scans.map((scan) => ({ ...scan, include: true }));
}

export function formatBodyScanMetrics(scan: ImportedBodyScan): string[] {
  return [
    scan.weight_kg != null ? `${scan.weight_kg} kg` : null,
    scan.body_fat_pct != null ? `${scan.body_fat_pct}% fat` : null,
    scan.skeletal_muscle_kg != null
      ? `${scan.skeletal_muscle_kg} kg muscle`
      : null,
  ].filter((value): value is string => value !== null);
}
