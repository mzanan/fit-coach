import { Download, FileText, KeyRound } from "lucide-react";

import { Surface } from "@/components/ui/Surface";

const ITEMS = [
  {
    icon: KeyRound,
    title: "Your own AI provider",
    body: "Connect Groq, Anthropic, Gemini, OpenRouter and more with your own key.",
  },
  {
    icon: FileText,
    title: "Import your history",
    body: "Paste an existing Markdown log. AI extracts it and you review it before anything is saved.",
  },
  {
    icon: Download,
    title: "Back up anytime",
    body: "Export everything to JSON and restore it later.",
  },
];

export function OwnershipList() {
  return (
    <section className="mx-auto max-w-(--container-wide) px-gutter py-section">
      <div className="reveal max-w-[40rem]">
        <p className="eyebrow">Your data</p>
        <h2 className="mt-2.5 text-h1 font-semibold md:text-hero md:tracking-(--tracking-hero)">
          Bring your history. Bring your own AI.
        </h2>
      </div>
      <div className="mt-block grid gap-3 md:grid-cols-3 md:gap-4">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <Surface key={title} className="reveal">
            <Icon
              aria-hidden
              className="size-[18px] text-muted-foreground"
              strokeWidth={1.5}
            />
            <h3 className="mt-3 text-title font-medium">{title}</h3>
            <p className="mt-1 text-meta text-muted-foreground">{body}</p>
          </Surface>
        ))}
      </div>
    </section>
  );
}
