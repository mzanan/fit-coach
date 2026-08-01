"use client";

import { Check, KeyRound, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Label } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { SearchField } from "@/components/ui/SearchField";
import { Surface } from "@/components/ui/Surface";
import { useAiSettings } from "@/components/settings/useAiSettings";
import type { ModelInfo } from "@/lib/ai/registry";
import { cn } from "@/lib/utils";

interface AiCardProps {
  configured: boolean;
  currentModel: string | null;
  models: ModelInfo[];
}

function ModelRow({
  model,
  active,
  disabled,
  onPick,
}: {
  model: ModelInfo;
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

export function AiCard({ configured, currentModel, models }: AiCardProps) {
  const ai = useAiSettings(configured, currentModel, models);

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
          {configured ? "Your key" : "Not configured"}
        </p>
        <p className="mt-1.5 text-meta text-muted-foreground">
          {configured
            ? `Coach and import run on ${currentModel} with your OpenRouter key.`
            : "The coach and Markdown import stay off until you add your own OpenRouter API key."}
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
        <div>
          <Label htmlFor="openrouter-key">OpenRouter API key</Label>
          <Input
            id="openrouter-key"
            type="password"
            autoComplete="off"
            placeholder="sk-or-..."
            value={ai.apiKey}
            onChange={(e) => ai.setApiKey(e.target.value)}
          />
        </div>
      )}

      <div>
        <Label htmlFor="model-search">Model</Label>
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
              {models.length
                ? "No models match your search."
                : "Could not load the model list. Reload to retry."}
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
