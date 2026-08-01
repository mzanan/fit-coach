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

const LABEL: Record<AiProvider, string> = {
  openrouter: "OpenRouter",
  groq: "Groq",
};

export function useAiSettings(
  setup: AiSetup,
  openrouterModels: ModelInfo[],
  groqModels: ModelInfo[] | null,
  groqListFailed: boolean,
) {
  const [pending, startTransition] = useTransition();
  const [provider, setProvider] = useState<AiProvider>(
    setup.active?.provider ?? "openrouter",
  );
  const [apiKey, setApiKey] = useState("");
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typedModels, setTypedModels] = useState<ModelInfo[] | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<AiProvider, string>>>({});

  const savedFor = (target: AiProvider) =>
    setup.saved.find((credential) => credential.provider === target) ?? null;

  const saved = savedFor(provider);
  const isActive = setup.active?.provider === provider;
  const selected = saved?.model ?? drafts[provider] ?? null;

  function clearDraft(target: AiProvider) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[target];
      return next;
    });
  }

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

  const ordered = useMemo(() => {
    const index = selected
      ? filtered.findIndex((model) => model.id === selected)
      : -1;
    if (index <= 0) return filtered;
    const rest = [...filtered];
    const [current] = rest.splice(index, 1);
    return [current, ...rest];
  }, [filtered, selected]);

  const visible = ordered.slice(0, VISIBLE_LIMIT);
  const hiddenCount = ordered.length - visible.length;
  const listFailed =
    provider === "groq" ? Boolean(saved) && groqListFailed : false;
  const needsKeyToList =
    provider === "groq" && !saved && !groqModels && typedModels === null;
  const canSave = Boolean(apiKey.trim() && selected);
  const selectedModel = models.find((model) => model.id === selected) ?? null;

  function switchProvider(next: string) {
    if (next === provider) return;
    if (next !== "openrouter" && next !== "groq") return;

    const previous = provider;
    setProvider(next);
    setApiKey("");
    setSearch("");
    if (!savedFor(next) || setup.active?.provider === next) return;

    startTransition(async () => {
      try {
        const result = await activateProviderAction(next);
        if (result.error) {
          toast.error(result.error);
          setProvider(previous);
          return;
        }
        toast.success(`Coach now runs on ${LABEL[next]}`);
      } catch {
        toast.error("Could not switch provider. Try again.");
        setProvider(previous);
      }
    });
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
      exec(() => updateAiModelAction({ provider, model }), "Model updated");
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
        clearDraft(provider);
      },
    );
  }

  function removeKey() {
    exec(() => removeAiSettingsAction(provider), "AI key removed", () => {
      setConfirmOpen(false);
      setTypedModels(null);
      clearDraft(provider);
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
    listFailed,
    loadModels,
    canSave,
    pick,
    save,
    removeKey,
  };
}
