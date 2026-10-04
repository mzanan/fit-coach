export const SITE_URL = "https://coach.itsmatias.com";
export const SITE_NAME = "Fit Coach";
export const SITE_DESCRIPTION =
  "Nutrition and training tracking with an AI coach.";

export const LANDING_TITLE = "Fit Coach: macro tracking with an AI coach";
export const LANDING_DESCRIPTION =
  "Log meals in a few taps, track macros, workouts and body composition, and ask an AI coach that remembers your history. Free installable web app.";

export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
];

export const PRIVATE_PATHS = ["/api/"];

export const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": `${SITE_URL}/#app`,
  name: SITE_NAME,
  url: SITE_URL,
  description:
    "Mobile-first installable app to log meals in a few taps, see live macros against targets and track training, with an AI coach that remembers your history and advises like a nutritionist and strength coach.",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web, iOS, Android (installable PWA)",
  author: {
    "@type": "Person",
    name: "Matias Zanan",
    url: "https://itsmatias.com",
  },
};

export const landingJsonLd = { ...appJsonLd, isAccessibleForFree: true };
