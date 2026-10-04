import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { JsonLd } from "@/components/ui/JsonLd";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { appJsonLd } from "@/lib/seo";
import { getUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign in",
  alternates: { canonical: "/login" },
};

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect("/");

  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID);
  const signupsDisabled = process.env.AUTH_DISABLE_SIGNUPS === "true";

  return (
    <main className="relative flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <JsonLd data={appJsonLd} />
      <ThemeToggle className="absolute top-[calc(env(safe-area-inset-top)+0.5rem)] right-3" />

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="flex-[1.4] min-h-16 md:flex-1" />

        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-(--dur-slow) ease-(--ease-out-soft)">
          <p className="eyebrow">Nutrition and training</p>
          <h1 className="mt-2.5 text-h1 font-medium tracking-(--tracking-snug) md:text-hero md:tracking-(--tracking-hero)">
            Fit Coach
          </h1>
        </div>

        <div className="mt-block animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards delay-(--stagger-1) duration-(--dur-slow) ease-(--ease-out-soft)">
          <LoginForm googleEnabled={googleEnabled} />
        </div>

        <div className="flex-1" />

        {signupsDisabled ? (
          <p className="text-center text-meta text-muted-foreground">
            Invite only. New accounts are closed.
          </p>
        ) : null}

        <Link
          href="/privacy"
          className="mt-3 text-center text-meta text-muted-foreground underline-offset-4 hover:underline"
        >
          Privacy policy
        </Link>
      </div>
    </main>
  );
}
