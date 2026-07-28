import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect("/");

  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID);
  const signupsDisabled = process.env.AUTH_DISABLE_SIGNUPS === "true";

  return (
    <main className="relative flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
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
      </div>
    </main>
  );
}
