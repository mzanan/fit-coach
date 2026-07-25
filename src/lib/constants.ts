export const MEAL_CATEGORIES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "post_gym", label: "Post-gym" },
  { key: "lunch", label: "Lunch" },
  { key: "snack", label: "Snack" },
  { key: "dinner", label: "Dinner" },
] as const;

export type MealCategoryKey = (typeof MEAL_CATEGORIES)[number]["key"];

export function categoryLabel(key: string): string {
  return MEAL_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export const FAT_QUALITIES = [
  { key: "clean", label: "Clean" },
  { key: "oily", label: "Oily" },
] as const;

export type FatQuality = (typeof FAT_QUALITIES)[number]["key"];

export const COMPONENT_GROUPS = [
  { key: "protein", label: "Protein" },
  { key: "carb", label: "Carb" },
  { key: "veg", label: "Veg" },
  { key: "sauce", label: "Sauce" },
  { key: "other", label: "Other" },
] as const;

export type ComponentGroup = (typeof COMPONENT_GROUPS)[number]["key"];

export const DEFAULT_SPLIT = [
  "Upper A",
  "Lower A",
  "Upper B",
  "Lower B",
] as const;

export const TIMEZONE_DEFAULT = "Asia/Ho_Chi_Minh";
export const DAY_CUTOFF_DEFAULT = 4;
