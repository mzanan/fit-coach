"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import type { ModelInfo } from "@/lib/ai/registry";
import type { AiProvider } from "@/lib/ai/providers";
import {
  listGroqModelsAction,
  removeAiSettingsAction,
  saveAiSettingsAction,
  updateAiModelAction,
  type AiActionResult,
  type GroqModelInfo,
} from "@/lib/actions/aiSettings";

const VISIBLE_LIMIT = 30;

export interface PickerModel {
  id: string;
  name: string;
  tools: boolean;
  structured: boolean;
  free: boolean;
}

export function useAiSettings(
  configured: boolean,
  currentProvider: AiProvider,
  currentModel: string | null,
  openrouterModels: ModelInfo[],
) {
  const [pending, startTransition] = useTransition();
  const [provider, setProvider] = useState<AiProvider>(currentProvider);
  const [apiKey, setApiKey] = useState("");
  const [selected, setSelected] = useState<string | null>(currentModel);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [groqModels, setGroqModels] = useState<GroqModelInfo[] | null>(null);

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

  const models = useMemo<PickerModel[]>(() => {
    if (provider === "groq") {
      return (groqModels ?? []).map((model) => ({
        id: model.id,
        name: model.id,
        tools: model.tools,
        structured: model.structured,
        free: false,
      }));
    }
    return openrouterModels;
  }, [provider, groqModels, openrouterModels]);

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
  const groqNeedsModels = provider === "groq" && groqModels === null;
  const canSave = Boolean(apiKey.trim() && selected);

  function switchProvider(next: string) {
    if (pending || configured) return;
    if (next !== "openrouter" && next !== "groq") return;
    setProvider(next);
    setSelected(null);
    setSearch("");
  }

  function loadGroqModels() {
    if (!apiKey.trim()) {
      toast.error("Enter your Groq API key first.");
      return;
    }
    startTransition(async () => {
      const result = await listGroqModelsAction(apiKey.trim());
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setGroqModels(result.models ?? []);
    });
  }

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
      () =>
        saveAiSettingsAction({
          provider,
          apiKey: apiKey.trim(),
          model: selected,
        }),
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
    provider,
    switchProvider,
    apiKey,
    setApiKey,
    selected,
    search,
    setSearch,
    confirmOpen,
    setConfirmOpen,
    visible,
    hiddenCount,
    groqNeedsModels,
    loadGroqModels,
    canSave,
    pick,
    save,
    removeKey,
  };
}
