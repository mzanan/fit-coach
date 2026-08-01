"use client";

import { useMemo, useState } from "react";

import { useAction } from "@/hooks/useAction";
import type { ModelInfo } from "@/lib/ai/registry";
import {
  removeAiSettingsAction,
  saveAiSettingsAction,
  updateAiModelAction,
} from "@/lib/actions/aiSettings";

const VISIBLE_LIMIT = 30;

export function useAiSettings(
  configured: boolean,
  currentModel: string | null,
  models: ModelInfo[],
) {
  const { pending, run } = useAction();
  const [apiKey, setApiKey] = useState("");
  const [selected, setSelected] = useState<string | null>(currentModel);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      run(() => updateAiModelAction(model), {
        success: "Model updated",
        onDone: () => setSelected(model),
      });
      return;
    }
    setSelected(model);
  }

  function save() {
    if (!canSave) return;
    run(() => saveAiSettingsAction({ apiKey: apiKey.trim(), model: selected }), {
      success: "AI enabled",
      onDone: () => setApiKey(""),
    });
  }

  function removeKey() {
    run(() => removeAiSettingsAction(), {
      success: "AI key removed",
      onDone: () => setConfirmOpen(false),
    });
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
