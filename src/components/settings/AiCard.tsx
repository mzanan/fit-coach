"use client";

import { Fragment } from "react";
import { Check, KeyRound, ListRestart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Label } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { SearchField } from "@/components/ui/SearchField";
import { Segmented } from "@/components/ui/Segmented";
import { Surface } from "@/components/ui/Surface";
import { useAiSettings } from "@/components/settings/useAiSettings";
import type { AiSetup } from "@/lib/ai/aiCredentials";
import type { ModelInfo } from "@/lib/ai/capabilities";
import type { AiProvider } from "@/lib/ai/options";
import { cn } from "@/lib/utils";

const PROVIDER_OPTIONS = [
  { value: "openrouter", label: "OpenRouter" },
  { value: "groq", label: "Groq" },
  { value: "google", label: "Google" },
] as const;

const PROVIDER_LABEL: Record<AiProvider, string> = {
  openrouter: "OpenRouter",
  groq: "Groq",
  google: "Google",
};

interface AiCardProps {
  setup: AiSetup;
  openrouterModels: ModelInfo[];
  openrouterFailed: boolean;
  groqModels: ModelInfo[] | null;
  groqFailed: boolean;
  googleModels: ModelInfo[] | null;
  googleFailed: boolean;
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
        active ? "border-ring bg-well" : "border-transparent hover:bg-overlay",
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
      {!model.structured && !model.tools ? <Pill>Basic</Pill> : null}
      {active ? <Check className="size-4 shrink-0" strokeWidth={1.5} /> : null}
    </button>
  );
}

export function AiCard({
  setup,
  openrouterModels,
  openrouterFailed,
  groqModels,
  groqFailed,
  googleModels,
  googleFailed,
}: AiCardProps) {
  const ai = useAiSettings(
    setup,
    openrouterModels,
    groqModels,
    groqFailed,
    googleModels,
    googleFailed,
  );
  const limited = ai.selectedModel && !ai.selectedModel.tools;
  const listFailed =
    ai.listFailed || (ai.provider === "openrouter" && openrouterFailed);

  return (
    <div className="space-y-block">
      <Surface level="raised" className="relative p-card">
        {setup.active ? (
          <Pill tone="brand" className="absolute top-4 right-4">
            {PROVIDER_LABEL[setup.active.provider]}
          </Pill>
        ) : null}
        <p className="eyebrow">Coach runs on</p>
        <p className="mt-2 text-metric font-medium">
          {setup.active?.model ?? "Not configured"}
        </p>
        <p className="mt-1.5 text-meta text-muted-foreground">
          {setup.active
            ? "Keys stay saved per provider, so you can switch back and forth without pasting them again."
            : "The coach and Markdown import stay off until you add your own API key."}
        </p>
      </Surface>

      <div>
        <Label>Provider</Label>
        <Segmented
          options={PROVIDER_OPTIONS}
          value={ai.provider}
          onChange={ai.switchProvider}
          ariaLabel="AI provider"
        />
        {ai.saved ? (
          <p className="mt-1.5 text-meta text-muted-foreground">
            {ai.isActive
              ? `Key saved. The coach is using ${PROVIDER_LABEL[ai.provider]}.`
              : `Key saved. Tap to switch the coach to ${PROVIDER_LABEL[ai.provider]}.`}
          </p>
        ) : null}
      </div>

      {ai.saved ? null : (
        <div>
          <Label htmlFor="ai-key">{PROVIDER_LABEL[ai.provider]} API key</Label>
          <Input
            id="ai-key"
            type="password"
            autoComplete="off"
            placeholder={
              ai.provider === "groq"
                ? "gsk_..."
                : ai.provider === "google"
                  ? "AIza..."
                  : "sk-or-..."
            }
            value={ai.apiKey}
            onChange={(e) => ai.setApiKey(e.target.value)}
          />
        </div>
      )}

      <div>
        <Label htmlFor="model-search">Model</Label>
        {ai.needsKeyToList ? (
          <Button
            variant="outline"
            className="w-full"
            disabled={ai.pending}
            onClick={ai.loadModels}
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
            <Surface
              level="sunken"
              className="mt-2 max-h-96 overflow-y-auto p-1.5"
            >
              {ai.visible.length ? (
                <div className="space-y-0.5">
                  {ai.visible.map((model, index) => (
                    <Fragment key={model.id}>
                      {index === ai.testedLabelAt ? (
                        <p className="eyebrow px-3.5 pt-1 pb-1.5">
                          Tested, supports tool calls and meal logging
                        </p>
                      ) : null}
                      {index === ai.testedDividerAt ? (
                        <hr className="my-1.5 border-border" />
                      ) : null}
                      <ModelRow
                        model={model}
                        active={model.id === ai.selected}
                        disabled={ai.pending}
                        onPick={() => ai.pick(model.id)}
                      />
                    </Fragment>
                  ))}
                </div>
              ) : (
                <p className="px-3.5 py-6 text-center text-meta text-muted-foreground">
                  {listFailed
                    ? `Could not load ${PROVIDER_LABEL[ai.provider]}'s model list. Your key stays saved, reload to retry.`
                    : "No models match your search."}
                </p>
              )}
              {ai.hiddenCount > 0 ? (
                <p className="px-3.5 py-2 text-meta text-muted-foreground">
                  {ai.hiddenCount} more, refine your search.
                </p>
              ) : null}
            </Surface>
            <p className="mt-1.5 text-meta text-muted-foreground">
              {limited
                ? `${ai.selectedModel?.id} has no verified tool support here: the coach answers from a fixed snapshot and Markdown import stays off.`
                : "Tools let the coach query your data. Markdown import needs the JSON badge."}
            </p>
          </>
        )}
      </div>

      {ai.saved ? (
        <Button
          variant="outline"
          className="w-full"
          disabled={ai.pending}
          onClick={() => ai.setConfirmOpen(true)}
        >
          <Trash2 className="size-4" />
          Remove {PROVIDER_LABEL[ai.provider]} key
        </Button>
      ) : (
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
        title={`Remove your ${PROVIDER_LABEL[ai.provider]} key?`}
        body="Your other provider keys stay. If this was the active one, the coach falls back to another saved key or turns off."
        confirmLabel="Remove"
        tone="destructive"
        pending={ai.pending}
        onConfirm={ai.removeKey}
      />
    </div>
  );
}
