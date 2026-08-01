"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import type { ModelInfo } from "@/lib/ai/registry";
import {
  removeAiSettingsAction,
  saveAiSettingsAction,
  updateAiModelAction,
  type AiActionResult,
} from "@/lib/actions/aiSettings";

const VISIBLE_LIMIT = 30;

export function useAiSettings(
  configured: boolean,
  currentModel: string | null,
  models: ModelInfo[],
) {
  const [pending, startTransition] = useTransition();
  const [apiKey, setApiKey] = useState("");
  const [selected, setSelected] = useState<string | null>(currentModel);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  function exec(
    fn: () => Promise<AiActionResult>,
    success: string,
    onDone?: () => void,
  ) {
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(success);
        onDone?.();
      } catch {
        toast.error("Something went wrong. Try again.");
      }
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return models;
    return models.filter(
      (model) =>
        model.id.toLowerCase().includes(query) ||
        model.name.toLowerCase().includes(query),
    );
  }, [models, search]);

  const visible = filtered.slice(0, VISIBLE_LIMIT);
  const hiddenCount = filtered.length - visible.length;
  const canSave = Boolean(apiKey.trim() && selected);

  function pick(model: string) {
    if (configured) {
      exec(() => updateAiModelAction(model), "Model updated", () =>
        setSelected(model),
      );
      return;
    }
    setSelected(model);
  }

  function save() {
    if (!canSave) return;
    exec(
      () => saveAiSettingsAction({ apiKey: apiKey.trim(), model: selected }),
      "AI enabled",
      () => setApiKey(""),
    );
  }

  function removeKey() {
    exec(() => removeAiSettingsAction(), "AI key removed", () =>
      setConfirmOpen(false),
    );
  }

  return {
    pending,
    apiKey,
    setApiKey,
    selected,
    search,
    setSearch,
    confirmOpen,
    setConfirmOpen,
    visible,
    hiddenCount,
    canSave,
    pick,
    save,
    removeKey,
  };
}
