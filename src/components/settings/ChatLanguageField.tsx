"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Surface } from "@/components/ui/Surface";
import { updateChatLanguage } from "@/lib/actions/profile";
import { CHAT_LANGUAGE_MAX } from "@/lib/constants";
import { useAction } from "@/hooks/useAction";

export function ChatLanguageField({ initial }: { initial: string | null }) {
  const { pending, run } = useAction();
  const [language, setLanguage] = useState(initial ?? "");

  return (
    <Surface className="p-card">
      <p className="text-body font-medium">Chat language</p>
      <p className="mt-0.5 mb-card text-meta text-muted-foreground">
        The language the coach writes app-generated messages in, like the
        weekly summary request. Detected once from your own messages and never
        changed again on its own. What you set here always wins.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateChatLanguage({ language }), { success: "Saved" });
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="Spanish"
          maxLength={CHAT_LANGUAGE_MAX}
          aria-label="Chat language"
          className="max-w-60"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </form>
    </Surface>
  );
}
