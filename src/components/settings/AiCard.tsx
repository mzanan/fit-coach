"use client";

import { Check, KeyRound, ListRestart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Label } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { SearchField } from "@/components/ui/SearchField";
import { Segmented } from "@/components/ui/Segmented";
import { Surface } from "@/components/ui/Surface";
import { useAiSettings, type PickerModel } from "@/components/settings/useAiSettings";
import type { AiProvider } from "@/lib/ai/providers";
import type { ModelInfo } from "@/lib/ai/registry";
import { cn } from "@/lib/utils";

const PROVIDER_OPTIONS = [
  { value: "openrouter", label: "OpenRouter" },
  { value: "groq", label: "Groq" },
] as const;

const PROVIDER_LABEL: Record<AiProvider, string> = {
  openrouter: "OpenRouter",
  groq: "Groq",
};

interface AiCardProps {
  configured: boolean;
  currentProvider: AiProvider;
  currentModel: string | null;
  models: ModelInfo[];
}

function ModelRow({
  model,
  active,
  disabled,
  onPick,
}: {
  model: PickerModel;
  active: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={cn(
        "flex w-full items-center gap-2 rounded-control border px-3.5 py-3 text-left transition-colors duration-(--dur-fast) ease-(--ease-out-soft)",
        active
          ? "border-ring bg-well"
          : "border-transparent hover:bg-overlay",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body">{model.name}</span>
        <span className="block truncate text-meta text-muted-foreground">
          {model.id}
        </span>
      </span>
      {model.free ? <Pill tone="brand">Free</Pill> : null}
      {model.structured ? <Pill>JSON</Pill> : null}
      {model.tools ? <Pill>Tools</Pill> : null}
      {active ? <Check className="size-4 shrink-0" strokeWidth={1.5} /> : null}
    </button>
  );
}

export function AiCard({
  configured,
  currentProvider,
  currentModel,
  models,
}: AiCardProps) {
  const ai = useAiSettings(configured, currentProvider, currentModel, models);

  return (
    <div className="space-y-block">
      <Surface level="raised" className="relative p-card">
        {configured ? (
          <Pill tone="brand" className="absolute top-4 right-4">
            Enabled
          </Pill>
        ) : null}
        <p className="eyebrow">Status</p>
        <p className="mt-2 text-metric font-medium">
          {configured ? PROVIDER_LABEL[currentProvider] : "Not configured"}
        </p>
        <p className="mt-1.5 text-meta text-muted-foreground">
          {configured
            ? `Coach and import run on ${currentModel} with your ${PROVIDER_LABEL[currentProvider]} key.`
            : "The coach and Markdown import stay off until you add your own API key."}
        </p>
      </Surface>

      {configured ? (
        <Button
          variant="outline"
          className="w-full"
          disabled={ai.pending}
          onClick={() => ai.setConfirmOpen(true)}
        >
          <Trash2 className="size-4" />
          Remove key
        </Button>
      ) : (
        <>
          <div>
            <Label>Provider</Label>
            <Segmented
              options={PROVIDER_OPTIONS}
              value={ai.provider}
              onChange={ai.switchProvider}
              ariaLabel="AI provider"
            />
          </div>
          <div>
            <Label htmlFor="ai-key">
              {PROVIDER_LABEL[ai.provider]} API key
            </Label>
            <Input
              id="ai-key"
              type="password"
              autoComplete="off"
              placeholder={ai.provider === "groq" ? "gsk_..." : "sk-or-..."}
              value={ai.apiKey}
              onChange={(e) => ai.setApiKey(e.target.value)}
            />
          </div>
        </>
      )}

      <div>
        <Label htmlFor="model-search">Model</Label>
        {ai.groqNeedsModels ? (
          <Button
            variant="outline"
            className="w-full"
            disabled={ai.pending}
            onClick={ai.loadGroqModels}
          >
            <ListRestart className="size-4" />
            {ai.pending ? "Loading..." : "Load models with this key"}
          </Button>
        ) : (
          <>
            <SearchField
              value={ai.search}
              onChange={ai.setSearch}
              placeholder="Search models"
              aria-label="Search models"
            />
            <Surface level="sunken" className="mt-2 max-h-96 overflow-y-auto p-1.5">
              {ai.visible.length ? (
                <div className="space-y-0.5">
                  {ai.visible.map((model) => (
                    <ModelRow
                      key={model.id}
                      model={model}
                      active={model.id === ai.selected}
                      disabled={ai.pending}
                      onPick={() => ai.pick(model.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="px-3.5 py-6 text-center text-meta text-muted-foreground">
                  No models match your search.
                </p>
              )}
              {ai.hiddenCount > 0 ? (
                <p className="px-3.5 py-2 text-meta text-muted-foreground">
                  {ai.hiddenCount} more, refine your search.
                </p>
              ) : null}
            </Surface>
            <p className="mt-1.5 text-meta text-muted-foreground">
              Markdown import needs a model with the JSON badge.
            </p>
          </>
        )}
      </div>

      {configured ? null : (
        <Button
          variant="solid"
          className="w-full"
          disabled={!ai.canSave || ai.pending}
          onClick={ai.save}
        >
          <KeyRound className="size-4" />
          {ai.pending ? "Validating..." : "Save and enable AI"}
        </Button>
      )}

      <ConfirmDialog
        open={ai.confirmOpen}
        onOpenChange={ai.setConfirmOpen}
        title="Remove your AI key?"
        body="The coach and Markdown import turn off until you add a key again. Nothing else is deleted."
        confirmLabel="Remove"
        tone="destructive"
        pending={ai.pending}
        onConfirm={ai.removeKey}
      />
    </div>
  );
}
