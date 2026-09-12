import type { ModelRef } from "@/lib/ai/aiCredentials";
import { PROVIDER_LABEL } from "@/lib/ai/options";
import type { ResolveFailure } from "@/lib/catalogMeal";
import type { CoachContext } from "@/lib/ai/coachContext";

export function deterministicReply(ctx: CoachContext): string {
  return `Add your AI provider key in Settings > AI to enable coaching. Snapshot:\n${ctx.lines.join("\n")}`;
}

export function aiErrorReply(): string {
  return "The coach could not reach your AI model. Nothing was read or written. Check your key and model in Settings > AI, or try again.";
}

export function limitErrorReply(
  provider: ModelRef["provider"],
  error: unknown,
): string | null {
  const status = (error as { statusCode?: number })?.statusCode;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  const rateLimited =
    status === 429 ||
    /rate ?limit/i.test(name) ||
    /rate limit|quota|too many requests/i.test(message);
  if (!rateLimited) return null;

  const label = PROVIDER_LABEL[provider];
  const daily = /per[- ]day|RPD/i.test(message);
  const detail = daily
    ? "Your daily quota on the free tier is used up. It resets tomorrow, or add credits to your account."
    : "You are being rate limited right now. Wait a minute and ask again.";
  return `${label}: ${detail} Nothing was read or written.`;
}

export function previewFailure(reason: ResolveFailure, error: string): string {
  if (reason === "no_macros") return error;
  return "The coach tried to log a meal it could not identify in your catalog. Ask again naming the item.";
}

const LOG_INTENT =
  /(?<!\p{L})(registr\p{L}*|anot\p{L}*|logue\p{L}*|agreg\p{L}*|a[ñn]ad\p{L}*|sum(?!mar)\p{L}*|carg\p{L}*|log)(?!\p{L})/iu;

const ASKS_FOR_WRITE =
  /(?<!\p{L})(registr|anot|logue|guard|agreg|a[ñn]ad|carg)(ás|áme|arme|ame|as|ar|me|á|a)(?!\p{L})|(?<!\p{L})(pod[eé]s|puedes|podr[ií]as|can you|could you|please)\s+(\p{L}+\s+)?(registrar|anotar|guardar|agregar|a[ñn]adir|cargar|log|save|record|add)(?!\p{L})|^\s*(log|save|record|add)(?!\p{L})/iu;

const ASKING =
  /^[\s¿]*(qu[eé]|cu[aá]l|cu[aá]nt\p{L}*|c[oó]mo|cu[aá]ndo|d[oó]nde|por qu[eé]|qui[eé]n|what|which|how|when|where|why|who|do i|did i|have i|tengo|llevo|hay)(?!\p{L})/iu;

const CLAIMED_WRITE =
  /(?<!\p{L})(registrad[oa]s?|registr[eé]|anotad[oa]s?|anot[eé]|a[ñn]adid[oa]s?|agregad[oa]s?|guardad[oa]s?)(?!\p{L})|(?<!\p{L})i('ve| have)?\s+(just\s+)?(logged|saved|recorded|noted|added)(?!\p{L})|(?<!\p{L})(logged|saved|recorded|added)\s+(it|that|your|the)(?!\p{L})|(?<!\p{L})(se procede a|procedo a|voy a)\s+(registrar|anotar|guardar|a[ñn]adir|agregar)(?!\p{L})/iu;

const NOTHING_LOGGED =
  "Nothing was logged. The coach said it did, but it never ran the log, so log it yourself from the Today screen. The rest of the answer below may be wrong for the same reason.";

export function unloggedNotice(
  question: string | undefined,
  text: string,
  wrote: boolean,
): string {
  if (wrote || !question) return "";
  const asked = question.trim();
  if (!LOG_INTENT.test(asked)) return "";
  if (ASKING.test(asked) && !ASKS_FOR_WRITE.test(asked)) return "";
  if (!CLAIMED_WRITE.test(text)) return "";
  return NOTHING_LOGGED;
}

export const NO_TOOLS_NOTICE =
  "Heads up: this model cannot use the app's tools here, so the coach is answering from a fixed snapshot of your day. It cannot log anything or look anything else up. Switch to a model with the Tools badge in Settings > AI.";

export function leadWith(notice: string, text: string): string {
  return notice ? `${notice}\n\n${text}` : text;
}

export function askOf(question?: string): string {
  return question?.trim()
    ? question.trim()
    : "Give a short read on how today and the week are going, and the next action.";
}

export function exchangeOf(
  toolLog: string[],
  question: string | undefined,
  text: string,
  appGenerated = false,
): string {
  const asked = appGenerated
    ? "(tapped the weekly summary button)"
    : question?.trim() || "(daily check-in)";
  return [
    ...(toolLog.length
      ? ["Data the coach read from the app:", ...toolLog]
      : []),
    `User: ${asked}`,
    `Coach: ${text}`,
  ].join("\n");
}

const LEARNED_ADDENDUM_HEAD =
  "You just recorded this about the user, from the message they sent you in this turn:";

const LEARNED_ADDENDUM_TAIL =
  "Open your reply by acknowledging it in one short clause, in the user's language, so they know it was saved. Then answer their message. Take it into account in this very answer: if it is a food preference and the food is not in their catalog, say so and offer to add it, do not just ignore it and suggest something else.";

export function learnedAddendum(facts: string[]): string[] {
  return facts.length
    ? [
        [
          LEARNED_ADDENDUM_HEAD,
          ...facts.map((fact) => `- ${fact}`),
          LEARNED_ADDENDUM_TAIL,
        ].join("\n"),
      ]
    : [];
}
