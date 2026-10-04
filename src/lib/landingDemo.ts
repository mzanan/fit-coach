export const HERO_MACROS = {
  kcal: 1746,
  kcalTarget: 2400,
  proteinLeft: 42,
  bars: [
    { key: "protein", label: "Protein", current: 128, target: "170", pct: 75 },
    { key: "carbs", label: "Carbs", current: 142, target: "240", pct: 59 },
    { key: "fat", label: "Fat", current: 74, target: "60-80", pct: 92 },
  ],
} as const;

export const HERO_REMAINING = HERO_MACROS.kcalTarget - HERO_MACROS.kcal;
export const HERO_KCAL_PCT = Math.round(
  (HERO_MACROS.kcal / HERO_MACROS.kcalTarget) * 100,
);

export const RECENT_MEALS = [
  { name: "Chicken rice bowl", bowl: true, macros: { protein_g: 48, carbs_g: 62, fat_g: 14 } },
  { name: "Greek yogurt, oats, berries", bowl: false, macros: { protein_g: 32, carbs_g: 54, fat_g: 9 } },
  { name: "Salmon, potatoes, greens", bowl: false, macros: { protein_g: 41, carbs_g: 45, fat_g: 22 } },
];

export const COACH_EXCHANGE = {
  question: "Lunch was heavy on fat. Should I cut dinner?",
  answer:
    `No need. Fat is near the top of your range but calories are fine, ${HERO_REMAINING} kcal left. Protein is the gap: ${HERO_MACROS.proteinLeft} g to go. Keep dinner lean and protein first.`,
  learned: ["Skips dairy at night"],
};

export const WORKOUT_DEMO = {
  title: "Leg day",
  exercise: "Single-leg press",
  sets: [
    { n: 1, kg: 60, reps: 10 },
    { n: 2, kg: 60, reps: 9 },
    { n: 3, kg: 65, reps: 8 },
  ],
};

export const BODY_DEMO = [
  { label: "Muscle", value: "34.2", delta: 0.8, good: "up" },
  { label: "Body fat", value: "15.1", delta: -1.6, good: "down" },
  { label: "Weight", value: "78.4", delta: -0.4, good: "down" },
] as const;

export const LOG_BULLETS = [
  "Protein, carbs, fat and calories, with what is left for each.",
  "Separate carb targets for gym days and rest days.",
  "A day cutoff that fits late dinners, in your own timezone.",
  "Close the day with a summary.",
];

export const COACH_BULLETS = [
  "Keeps a running summary plus the facts you teach it: preferences, constraints, corrections.",
  "Corrections are always applied.",
  "Logs meals, workouts and measurements for you. Big changes wait for your approval.",
];

export const TRAIN_BULLETS = [
  "Animated demos from a catalog of 1,300+ exercises.",
  "Per-side weight for unilateral machines.",
];
