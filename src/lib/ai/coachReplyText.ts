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

const MODEL_UNAVAILABLE =
  /\bmodel\b[\s\S]{0,40}(not found|not granted|does not exist|unknown|not available|unavailable|not supported)|\b(unknown|invalid|unsupported) model\b/i;
const KEY_REJECTED = /api[ _-]?key|unauthori[sz]ed|authentication|invalid[ _]key/i;

interface ErrorParts {
  status: number | undefined;
  name: string;
  message: string;
}

function errorParts(error: unknown): ErrorParts {
  const source = (error as { lastError?: unknown } | null)?.lastError ?? error;
  const record = (typeof source === "object" && source !== null ? source : {}) as {
    statusCode?: unknown;
    code?: unknown;
    name?: unknown;
    message?: unknown;
  };
  const status =
    typeof record.statusCode === "number"
      ? record.statusCode
      : typeof record.code === "number"
        ? record.code
        : undefined;
  return {
    status,
    name: typeof record.name === "string" ? record.name : "",
    message: typeof record.message === "string" ? record.message : String(source),
  };
}

export function limitErrorReply(
  provider: ModelRef["provider"],
  error: unknown,
): string | null {
  const { status, name, message } = errorParts(error);
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

export function providerErrorReply(
  provider: ModelRef["provider"],
  error: unknown,
): string {
  const limited = limitErrorReply(provider, error);
  if (limited) return limited;
  const { status, message } = errorParts(error);
  const label = PROVIDER_LABEL[provider];
  if (status === 404 || (status !== undefined && status < 500 && MODEL_UNAVAILABLE.test(message))) {
    return `${label} does not offer the selected model to your key. Pick another one in Settings > AI. Nothing was read or written.`;
  }
  if (status === 401 || status === 403 || (status === 400 && KEY_REJECTED.test(message))) {
    return `${label} rejected your key. Check it in Settings > AI. Nothing was read or written.`;
  }
  if (status === 400) {
    return `${label} rejected the request for the selected model. Try another model in Settings > AI. Nothing was read or written.`;
  }
  if (status !== undefined && status >= 500) {
    return `${label} is failing right now. Try again in a minute. Nothing was read or written.`;
  }
  return aiErrorReply();
}

export function providerErrorDetail(error: unknown): string {
  const { status, message } = errorParts(error);
  return `${status ?? "no status"}: ${message}`.slice(0, 300);
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
