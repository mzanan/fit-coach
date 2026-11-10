import type { ComponentGroup, FatQuality } from "@/lib/constants";

export interface SeedComponent {
  name: string;
  group_name: ComponentGroup;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fat_quality?: FatQuality;
}

export interface SeedItem {
  name: string;
  place?: string;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fat_quality?: FatQuality;
  notes?: string;
  is_composable: boolean;
  components?: SeedComponent[];
}

// Values from the user's own tracking. Where only a partial macro was known,
// the rest is an estimate and the note says so.
export const SEED_CATALOG: SeedItem[] = [
  {
    name: "Mesala: Create Your Own",
    place: "Mesala",
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
    fat_quality: "clean",
    notes: "Clean kitchen. Build from components. Avoid the fatty sauces.",
    is_composable: true,
    components: [
      { name: "210G Ab-Free Chicken", group_name: "protein", protein_g: 70, fat_g: 9, carbs_g: 0 },
      { name: "140G Chicken", group_name: "protein", protein_g: 47, fat_g: 6, carbs_g: 0 },
      { name: "70G Chicken", group_name: "protein", protein_g: 23, fat_g: 3, carbs_g: 0 },
      { name: "100G Brown Rice", group_name: "carb", protein_g: 3, fat_g: 1, carbs_g: 23 },
      { name: "200G Brown Rice", group_name: "carb", protein_g: 6, fat_g: 2, carbs_g: 46 },
      { name: "100G Sweet Potato", group_name: "carb", protein_g: 1, fat_g: 0, carbs_g: 20 },
      { name: "Spicy Tamarind", group_name: "sauce", protein_g: 0, fat_g: 2, carbs_g: 0, fat_quality: "clean" },
      { name: "Balsamic", group_name: "sauce", protein_g: 0, fat_g: 5, carbs_g: 0, fat_quality: "clean" },
      { name: "Lime Wedge", group_name: "sauce", protein_g: 0, fat_g: 0, carbs_g: 0, fat_quality: "clean" },
      { name: "Garlic (avoid)", group_name: "sauce", protein_g: 0, fat_g: 21, carbs_g: 0, fat_quality: "oily" },
      { name: "Pesto (avoid)", group_name: "sauce", protein_g: 0, fat_g: 17, carbs_g: 0, fat_quality: "oily" },
      { name: "Peanut (avoid)", group_name: "sauce", protein_g: 0, fat_g: 17, carbs_g: 0, fat_quality: "oily" },
      { name: "Olive Oil (avoid)", group_name: "sauce", protein_g: 0, fat_g: 28, carbs_g: 0, fat_quality: "oily" },
    ],
  },
  {
    name: "Greek-Style Salad + 140G Chicken",
    place: "Mesala",
    protein_g: 46,
    fat_g: 4,
    carbs_g: 10,
    fat_quality: "clean",
    is_composable: false,
  },
  {
    name: "Poke Hawaii (tuna + rice)",
    place: "Poke Hawaii",
    protein_g: 35,
    fat_g: 22,
    carbs_g: 55,
    fat_quality: "oily",
    notes:
      "Not lean as default: avocado ~8-10g fat, sauteed mushrooms ~2-3g, garlic sauce ~10-15g. Lean version: no avocado, soy on the side. Macros estimated.",
    is_composable: false,
  },
  {
    name: "Everyday Breakfast",
    protein_g: 26,
    fat_g: 10,
    carbs_g: 50,
    fat_quality: "clean",
    notes: "2 boiled eggs + oats with skim milk + banana. Carbs estimated.",
    is_composable: false,
  },
  {
    name: "ZProtein (1 scoop)",
    protein_g: 25,
    fat_g: 0,
    carbs_g: 1,
    fat_quality: "clean",
    notes: "32g scoop. Post-gym = ZProtein + Everyday Breakfast.",
    is_composable: false,
  },
  {
    name: "Bep An (chicken + salad)",
    place: "Bep An",
    protein_g: 44,
    fat_g: 8,
    carbs_g: 15,
    fat_quality: "clean",
    notes: "Lean. Macros beyond protein estimated.",
    is_composable: false,
  },
  {
    name: "Bun cha + extra pork",
    protein_g: 40,
    fat_g: 25,
    carbs_g: 60,
    fat_quality: "oily",
    notes: "Grilled pork, fattier. Macros beyond protein estimated.",
    is_composable: false,
  },
  {
    name: "Fire Ox chicken rice teriyaki",
    place: "Fire Ox",
    protein_g: 44,
    fat_g: 12,
    carbs_g: 70,
    fat_quality: "clean",
    notes: "Sweet teriyaki, carb-heavy. Macros beyond protein estimated.",
    is_composable: false,
  },
  {
    name: "Pollo Avo (breast + avocado salad)",
    protein_g: 45,
    fat_g: 20,
    carbs_g: 12,
    fat_quality: "clean",
    notes: "Medium-high fat but good quality (avocado). Macros beyond protein estimated.",
    is_composable: false,
  },
];
