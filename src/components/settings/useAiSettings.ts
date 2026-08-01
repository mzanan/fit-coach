"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import type { AiProvider, AiSetup } from "@/lib/ai/providers";
import type { ModelInfo } from "@/lib/ai/registry";
import {
  activateProviderAction,
  listGroqModelsAction,
  removeAiSettingsAction,
  saveAiSettingsAction,
  updateAiModelAction,
  type AiActionResult,
} from "@/lib/actions/aiSettings";

const VISIBLE_LIMIT = 30;

export function useAiSettings(
  setup: AiSetup,
  openrouterModels: ModelInfo[],
  groqModels: ModelInfo[] | null,
) {
  const startProvider = setup.active?.provider ?? "openrouter";
  const [pending, startTransition] = useTransition();
  const [provider, setProvider] = useState<AiProvider>(startProvider);
  const [apiKey, setApiKey] = useState("");
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typedModels, setTypedModels] = useState<ModelInfo[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const savedFor = (target: AiProvider) =>
    setup.saved.find((credential) => credential.provider === target) ?? null;

  const saved = savedFor(provider);
  const isActive = setup.active?.provider === provider;
  const selected = saved?.model ?? drafts[provider] ?? null;

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

  const models = useMemo(() => {
    if (provider === "openrouter") return openrouterModels;
    return groqModels ?? typedModels ?? [];
  }, [provider, openrouterModels, groqModels, typedModels]);

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
  const needsKeyToList =
    provider === "groq" && !groqModels && typedModels === null;
  const canSave = Boolean(apiKey.trim() && selected);
  const selectedModel = models.find((model) => model.id === selected) ?? null;

  function switchProvider(next: string) {
    if (pending || next === provider) return;
    if (next !== "openrouter" && next !== "groq") return;
    setProvider(next);
    setApiKey("");
    setSearch("");
    if (savedFor(next) && setup.active?.provider !== next) {
      exec(
        () => activateProviderAction(next),
        `Coach now runs on ${next === "groq" ? "Groq" : "OpenRouter"}`,
      );
    }
  }

  function loadModels() {
    if (!apiKey.trim()) {
      toast.error("Enter your API key first.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await listGroqModelsAction(apiKey.trim());
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setTypedModels(result.models ?? []);
      } catch {
        toast.error("Could not load the model list. Try again.");
      }
    });
  }

  function pick(model: string) {
    if (saved) {
      exec(() => updateAiModelAction(model), "Model updated");
      return;
    }
    setDrafts((current) => ({ ...current, [provider]: model }));
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
      () => {
        setApiKey("");
        setTypedModels(null);
      },
    );
  }

  function removeKey() {
    exec(() => removeAiSettingsAction(provider), "AI key removed", () => {
      setConfirmOpen(false);
      setTypedModels(null);
    });
  }

  return {
    pending,
    provider,
    switchProvider,
    saved,
    isActive,
    apiKey,
    setApiKey,
    selected,
    selectedModel,
    search,
    setSearch,
    confirmOpen,
    setConfirmOpen,
    visible,
    hiddenCount,
    needsKeyToList,
    loadModels,
    canSave,
    pick,
    save,
    removeKey,
  };
}
