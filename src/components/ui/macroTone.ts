export type MacroKey = "protein" | "carbs" | "fat";

export const MACRO_TONE: Record<MacroKey, { bar: string; dot: string }> = {
  protein: { bar: "bg-macro-protein", dot: "bg-macro-protein" },
  carbs: { bar: "bg-macro-carbs", dot: "bg-macro-carbs" },
  fat: { bar: "bg-macro-fat", dot: "bg-macro-fat" },
};
