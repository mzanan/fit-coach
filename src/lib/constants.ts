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

export const FAT_QUALITY_OPTIONS = [
  { value: "", label: "Unset" },
  ...FAT_QUALITIES.map((f) => ({ value: f.key, label: f.label })),
] as const;

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

export const BODY_SEGMENTS = [
  { key: "right_arm", label: "Right arm" },
  { key: "left_arm", label: "Left arm" },
  { key: "trunk", label: "Trunk" },
  { key: "right_leg", label: "Right leg" },
  { key: "left_leg", label: "Left leg" },
] as const;

export const SEGMENT_METRICS = [
  { key: "lean_kg", label: "Lean kg" },
  { key: "lean_pct", label: "Lean %" },
  { key: "fat_kg", label: "Fat kg" },
  { key: "fat_pct", label: "Fat %" },
  { key: "ecw_ratio", label: "ECW" },
  { key: "phase_angle", label: "Phase" },
] as const;

export const IMAGE_MAX_DIMENSION = 1600;

export const INBODY_FIELD_GROUPS = [
  {
    title: "Muscle and fat",
    fields: [
      { key: "weight_kg", label: "Weight (kg)", step: 0.1 },
      { key: "skeletal_muscle_kg", label: "Skeletal muscle (kg)", step: 0.1 },
      { key: "body_fat_kg", label: "Body fat (kg)", step: 0.1 },
      { key: "body_fat_pct", label: "Body fat (%)", step: 0.1 },
      { key: "bmi", label: "BMI", step: 0.1 },
      { key: "inbody_score", label: "InBody score", step: 1 },
    ],
  },
  {
    title: "Body composition",
    fields: [
      { key: "total_body_water_l", label: "Body water (L)", step: 0.1 },
      { key: "protein_kg", label: "Protein (kg)", step: 0.1 },
      { key: "minerals_kg", label: "Minerals (kg)", step: 0.01 },
      { key: "bone_mineral_kg", label: "Bone mineral (kg)", step: 0.01 },
      { key: "soft_lean_mass_kg", label: "Soft lean mass (kg)", step: 0.1 },
      { key: "fat_free_mass_kg", label: "Fat free mass (kg)", step: 0.1 },
      { key: "body_cell_mass_kg", label: "Body cell mass (kg)", step: 0.1 },
      { key: "ecw_ratio", label: "ECW ratio", step: 0.001 },
      { key: "phase_angle", label: "Phase angle", step: 0.1 },
    ],
  },
  {
    title: "Research parameters",
    fields: [
      { key: "smi", label: "SMI (kg/m2)", step: 0.1 },
      { key: "bmr_kcal", label: "BMR (kcal)", step: 1 },
      { key: "visceral_fat_level", label: "Visceral fat level", step: 1 },
      {
        key: "visceral_fat_area_cm2",
        label: "Visceral fat area (cm2)",
        step: 0.1,
      },
      { key: "waist_circumference_cm", label: "Waist (cm)", step: 0.1 },
      { key: "waist_hip_ratio", label: "Waist-hip ratio", step: 0.01 },
      { key: "obesity_degree_pct", label: "Obesity degree (%)", step: 1 },
      { key: "recommended_kcal", label: "Recommended kcal", step: 1 },
    ],
  },
  {
    title: "Weight control",
    fields: [
      { key: "target_weight_kg", label: "Target weight (kg)", step: 0.1 },
      { key: "weight_control_kg", label: "Weight control (kg)", step: 0.1 },
      { key: "fat_control_kg", label: "Fat control (kg)", step: 0.1 },
      { key: "muscle_control_kg", label: "Muscle control (kg)", step: 0.1 },
    ],
  },
  {
    title: "From the header",
    fields: [
      { key: "height_cm", label: "Height (cm)", step: 0.1 },
      { key: "age", label: "Age", step: 1 },
    ],
  },
] as const;

export const INBODY_TEXT_FIELDS = [
  { key: "device", label: "Device", placeholder: "InBody 580" },
  { key: "location", label: "Place", placeholder: "Gym" },
  { key: "member_id", label: "InBody ID", placeholder: "From the sheet" },
  { key: "gender", label: "Gender", placeholder: "male" },
  { key: "body_balance_upper", label: "Balance upper", placeholder: "balanced" },
  { key: "body_balance_lower", label: "Balance lower", placeholder: "balanced" },
  {
    key: "body_balance_upper_lower",
    label: "Balance upper-lower",
    placeholder: "balanced",
  },
] as const;

export const INBODY_NUMERIC_KEYS = INBODY_FIELD_GROUPS.flatMap((g) =>
  g.fields.map((f) => f.key),
);

export const INBODY_TEXT_KEYS = INBODY_TEXT_FIELDS.map((f) => f.key);

export type BodySegment = (typeof BODY_SEGMENTS)[number]["key"];
export type SegmentMetric = (typeof SEGMENT_METRICS)[number]["key"];
export type SegmentValues = Partial<Record<SegmentMetric, number | null>>;
export type Segmental = Partial<Record<BodySegment, SegmentValues | null>>;

export const EXERCISE_EQUIPMENT_OTHER = "__other";

export const EXERCISE_MUSCLE_FACETS = [
  { value: "abs", label: "Abs" },
  { value: "pectorals", label: "Chest" },
  { value: "upper back", label: "Back" },
  { value: "lats", label: "Lats" },
  { value: "delts", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "forearms", label: "Forearms" },
  { value: "glutes", label: "Glutes" },
  { value: "quads", label: "Quads" },
  { value: "hamstrings", label: "Hamstrings" },
  { value: "calves", label: "Calves" },
  { value: "traps", label: "Traps" },
  { value: "adductors", label: "Adductors" },
  { value: "abductors", label: "Abductors" },
  { value: "spine", label: "Spine" },
  { value: "serratus anterior", label: "Serratus" },
  { value: "levator scapulae", label: "Neck" },
  { value: "cardiovascular system", label: "Cardio" },
] as const;

export const EXERCISE_EQUIPMENT_FACETS = [
  { value: "body weight", label: "Bodyweight" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "barbell", label: "Barbell" },
  { value: "cable", label: "Cable" },
  { value: "leverage machine", label: "Machine" },
  { value: "smith machine", label: "Smith" },
  { value: "band", label: "Band" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "weighted", label: "Weighted" },
  { value: "stability ball", label: "Stability ball" },
  { value: EXERCISE_EQUIPMENT_OTHER, label: "Other" },
] as const;

export const EXERCISE_EQUIPMENT_KNOWN = EXERCISE_EQUIPMENT_FACETS.filter(
  (f) => f.value !== EXERCISE_EQUIPMENT_OTHER,
).map((f) => f.value);

export const EMBEDDING_DIM = 768;

export const COACH_FACT_CATEGORIES = [
  { key: "preference", label: "Preference" },
  { key: "constraint", label: "Constraint" },
  { key: "correction", label: "Correction" },
  { key: "routine", label: "Routine" },
  { key: "context", label: "Context" },
] as const;

export type CoachFactCategory = (typeof COACH_FACT_CATEGORIES)[number]["key"];

export const COACH_FACT_CATEGORY_KEYS = COACH_FACT_CATEGORIES.map((c) => c.key);

export const COACH_RULES_MAX = 20_000;
export const SUMMARY_RULES_MAX = 20_000;
export const CHAT_LANGUAGE_MAX = 32;

const CHAT_LANGUAGE_SHAPE = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+){0,2}$/u;

export function isChatLanguage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= CHAT_LANGUAGE_MAX &&
    CHAT_LANGUAGE_SHAPE.test(value)
  );
}
