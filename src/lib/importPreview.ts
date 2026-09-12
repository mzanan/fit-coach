import type {
  ImportedCatalogItem,
  ImportedMeal,
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
