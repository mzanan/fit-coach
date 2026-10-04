import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { BrandMark } from "@/components/ui/BrandMark";
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
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <JsonLd data={appJsonLd} />
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[28rem]"
      />
      <ThemeToggle className="absolute top-[calc(env(safe-area-inset-top)+0.5rem)] right-3" />

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="flex-[1.4] min-h-16 md:flex-1" />

        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-(--dur-slow) ease-(--ease-out-soft)">
          <BrandMark href="/" className="mb-6" />
          <h1 className="text-h1 font-semibold md:text-hero md:tracking-(--tracking-hero)">
            Your coach is <span className="text-brand-ink">ready.</span>
          </h1>
          <p className="mt-2.5 text-body text-muted-foreground">
            Sign in with Google or an email code.
          </p>
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
