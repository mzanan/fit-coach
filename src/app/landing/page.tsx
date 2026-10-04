import type { Metadata } from "next";

import { BodyPreview } from "@/components/landing/BodyPreview";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { CoachPreview } from "@/components/landing/CoachPreview";
import {
  COACH_BULLETS,
  LOG_BULLETS,
  TRAIN_BULLETS,
} from "@/lib/landingDemo";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { Hero } from "@/components/landing/Hero";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { OwnershipList } from "@/components/landing/OwnershipList";
import { RecentsPreview } from "@/components/landing/RecentsPreview";
import { WorkoutPreview } from "@/components/landing/WorkoutPreview";
import { JsonLd } from "@/components/ui/JsonLd";
import { LANDING_DESCRIPTION, LANDING_TITLE, landingJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: LANDING_TITLE },
  description: LANDING_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: LANDING_TITLE, description: LANDING_DESCRIPTION, url: "/" },
  twitter: {
    card: "summary_large_image",
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
  },
};

export default function LandingPage() {
  const signupsDisabled = process.env.AUTH_DISABLE_SIGNUPS === "true";
  const ctaLabel = signupsDisabled ? "Sign in" : "Get started";
  const meta = signupsDisabled
    ? "Invite only for now. Existing accounts can sign in."
    : "Free. Sign in with Google.";

  return (
    <>
      <JsonLd data={landingJsonLd} />
      <LandingHeader />
      <main id="main" className="flex-1">
        <Hero ctaLabel={ctaLabel} meta={meta} />
        <FeatureSection
          id="features"
          eyebrow="Log"
          title="A meal in a few taps."
          body="Pick from your saved meals or recents, or build a bowl component by component. Macros update against your targets as you log."
          bullets={LOG_BULLETS}
        >
          <RecentsPreview />
        </FeatureSection>
        <FeatureSection
          eyebrow="Coach"
          title="A coach that remembers what you told it."
          body="Ask about your day and get advice the way a nutritionist and strength coach would give it. Calm about a high-fat day when calories are in range, direct when protein runs low."
          bullets={COACH_BULLETS}
          reverse
        >
          <CoachPreview />
        </FeatureSection>
        <FeatureSection
          eyebrow="Train"
          title="Every set, with the form right there."
          body="Follow your routine, log sets as you go and check the exercise demo when you need it."
          bullets={TRAIN_BULLETS}
        >
          <WorkoutPreview />
        </FeatureSection>
        <FeatureSection
          eyebrow="Body"
          title="Progress is muscle up and fat down."
          body="Photograph your InBody result sheet and every value is read and cross-checked for you. Track weight and waist, and see recomposition instead of just the scale."
          reverse
        >
          <BodyPreview />
        </FeatureSection>
        <OwnershipList />
        <ClosingCta ctaLabel={ctaLabel} meta={meta} />
      </main>
      <LandingFooter />
    </>
  );
}
