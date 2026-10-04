import type { Metadata } from "next";

import { LegalSection } from "@/components/legal/LegalSection";
import { AnalyticsConsentRow } from "@/components/settings/AnalyticsConsentRow";
import { CreditLinks } from "@/components/ui/CreditLinks";
import { Page } from "@/components/ui/Page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Fit Coach collects, uses and protects your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <Page
        title="Privacy Policy"
        description="Last updated October 4, 2026"
        backHref="/"
        backLabel="Fit Coach"
      >
        <div className="space-y-block">
          <p className="text-body text-muted-foreground">
            Fit Coach is a nutrition and training coach operated by Matias Zanan
            at coach.itsmatias.com. This policy explains what we collect, why,
            and the choices you have.
          </p>

          <LegalSection title="Information we collect">
            <p>
              <strong className="text-foreground">Account.</strong> Your email,
              name and Google sign-in identifier.
            </p>
            <p>
              <strong className="text-foreground">
                Health and training data.
              </strong>{" "}
              The meals, workouts, body measurements, body composition scans,
              notes and coach conversations you add or import. This is health
              data, and we process it only to provide the coaching you ask for.
            </p>
            <p>
              <strong className="text-foreground">Integrations.</strong> AI
              provider keys you add are stored encrypted. Push notification
              subscriptions are stored if you turn them on.
            </p>
          </LegalSection>

          <LegalSection title="How we use it">
            <p>
              To run the service: log your data, generate coach replies and
              summaries, read the scans you upload and send the reminders you
              enable. A daily task also consolidates the coach&apos;s memory
              of you using your configured AI provider. We do not sell your
              data or use it for advertising.
            </p>
          </LegalSection>

          <LegalSection title="Processors we share with">
            <p>
              Vercel (hosting), Turso (database), Google (sign-in), the AI
              provider you choose (OpenRouter, Groq, Google or Experiential
              Labs) for coach replies and memory, our own Google credentials
              for search over your notes, our configured vision provider for
              reading scans, a verification service (Experiential Labs via
              OpenRouter) that receives recent conversation snippets to decide
              whether the coach may save data, your browser push service
              (notifications), jsDelivr (exercise images, receives your IP)
              and PostHog EU (analytics, see Cookies). Each only receives what
              it needs for its function.
            </p>
          </LegalSection>

          <LegalSection title="Data retention and deletion">
            <p>
              You can request full account deletion by emailing{" "}
              <a
                className="text-foreground underline underline-offset-4"
                href="mailto:hello@itsmatias.com"
              >
                hello@itsmatias.com
              </a>
              . We remove your data within 30 days of the request.
            </p>
          </LegalSection>

          <LegalSection title="Your rights">
            <p>
              You have the right to access, correct, export or delete your
              personal data. Contact us for any request.
            </p>
          </LegalSection>

          <LegalSection title="Cookies">
            <p>
              We use a session cookie to keep you signed in and a cookie that
              remembers your analytics choice. If you accept analytics, PostHog
              (EU region) sets first-party cookies for usage analytics and
              session replay with all text masked. If you decline, we only count
              visits anonymously without cookies. No advertising cookies. You
              can change your choice here at any time.
            </p>
            <AnalyticsConsentRow />
          </LegalSection>
        </div>
      </Page>
      <footer className="mt-section">
        <CreditLinks className="px-gutter" />
      </footer>
    </main>
  );
}
