"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { commitMdImport, extractMdImport } from "@/lib/actions/mdImport";
import type {
  ImportedCatalogItem,
  ImportedMeal,
  ImportedWorkout,
} from "@/lib/ai/mdImport";

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

export function useMdImport() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mdText, setMdText] = useState("");
  const [days, setDays] = useState<PreviewDay[] | null>(null);
  const [catalogItems, setCatalogItems] = useState<PreviewCatalogItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  function extract() {
    startTransition(async () => {
      try {
        const result = await extractMdImport(mdText);
        setDays(
          result.days.map((d, di) => ({
            day: d.day,
            meals: d.meals.map((m, mi) => ({
              ...m,
              key: `${di}-${mi}`,
              include: true,
            })),
            workout: d.workout ? { workout: d.workout, include: true } : null,
          })),
        );
        setCatalogItems(
          result.catalog_items.map((c, i) => ({
            ...c,
            key: `c-${i}`,
            include: true,
          })),
        );
        setWarnings(result.warnings);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Extraction failed");
      }
    });
  }

  async function loadFile(file: File) {
    setMdText(await file.text());
  }

  function updateMeal(day: string, key: string, values: Partial<ImportedMeal>) {
    setDays(
      (prev) =>
        prev?.map((d) =>
          d.day === day
            ? {
                ...d,
                meals: d.meals.map((m) =>
                  m.key === key ? { ...m, ...values } : m,
                ),
              }
            : d,
        ) ?? null,
    );
  }

  function toggleMeal(day: string, key: string, include: boolean) {
    updateMeal(day, key, { include } as Partial<ImportedMeal>);
  }

  function toggleWorkout(day: string, include: boolean) {
    setDays(
      (prev) =>
        prev?.map((d) =>
          d.day === day && d.workout
            ? { ...d, workout: { ...d.workout, include } }
            : d,
        ) ?? null,
    );
  }

  function toggleCatalogItem(key: string, include: boolean) {
    setCatalogItems((prev) =>
      prev.map((c) => (c.key === key ? { ...c, include } : c)),
    );
  }

  function reset() {
    setDays(null);
    setCatalogItems([]);
    setWarnings([]);
  }

  function commit() {
    if (!days) return;
    startTransition(async () => {
      try {
        const payload = {
          days: days
            .map((d) => ({
              day: d.day,
              meals: d.meals
                .filter((m) => m.include)
                .map((m) => ({
                  category: m.category,
                  name: m.name,
                  place: m.place,
                  fat_quality: m.fat_quality,
                  protein_g: m.protein_g,
                  fat_g: m.fat_g,
                  carbs_g: m.carbs_g,
                })),
              workout: d.workout?.include ? d.workout.workout : null,
            }))
            .filter((d) => d.meals.length || d.workout),
          catalog_items: catalogItems
            .filter((c) => c.include)
            .map((c) => ({
              name: c.name,
              place: c.place,
              fat_quality: c.fat_quality,
              notes: c.notes,
              protein_g: c.protein_g,
              fat_g: c.fat_g,
              carbs_g: c.carbs_g,
            })),
          warnings: [],
        };
        const result = await commitMdImport(payload);
        toast.success(
          `Imported ${result.meals} meals, ${result.workouts} workouts, ${result.catalogItems} catalog items`,
        );
        router.push("/");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Import failed");
      }
    });
  }

  const included = days
    ? {
        meals: days.reduce(
          (n, d) => n + d.meals.filter((m) => m.include).length,
          0,
        ),
        workouts: days.filter((d) => d.workout?.include).length,
        catalogItems: catalogItems.filter((c) => c.include).length,
      }
    : null;

  return {
    pending,
    mdText,
    setMdText,
    loadFile,
    extract,
    days,
    catalogItems,
    warnings,
    included,
    updateMeal,
    toggleMeal,
    toggleWorkout,
    toggleCatalogItem,
    reset,
    commit,
  };
}
