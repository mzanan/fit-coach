import type { Meal } from "@/lib/db/schema";

export function toMealDto(meal: Meal) {
  return {
    id: meal.id,
    category: meal.category,
    name: meal.name,
    place: meal.place,
    protein_g: meal.protein_g,
    fat_g: meal.fat_g,
    carbs_g: meal.carbs_g,
    fat_quality: meal.fat_quality,
    catalog_item_id: meal.catalog_item_id,
  };
}
