export interface GoogleModel {
  id: string;
  name: string;
  maxInputChars: number;
  freeTier: boolean;
}

export const GOOGLE_MODELS: GoogleModel[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    maxInputChars: 120_000,
    freeTier: true,
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    maxInputChars: 120_000,
    freeTier: true,
  },
];

export function googleModel(id: string): GoogleModel | null {
  return GOOGLE_MODELS.find((model) => model.id === id) ?? null;
}
