import { FileText } from "lucide-react";

import { ChatLanguageField } from "@/components/settings/ChatLanguageField";
import { DiningModeField } from "@/components/settings/DiningModeField";
import { TextRulesForm } from "@/components/settings/TextRulesForm";
import { ListGroup, ListRow } from "@/components/ui/ListRow";
import { Page } from "@/components/ui/Page";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Surface } from "@/components/ui/Surface";
import { updateCoachRules, updateSummaryRules } from "@/lib/actions/profile";
import { COACH_RULES_MAX, SUMMARY_RULES_MAX } from "@/lib/constants";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function CoachRulesPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);

  return (
    <Page
      backHref="/settings"
      backLabel="Back to settings"
      title="Coach rules"
      description="The method the coach follows. Paste your own to replace the built-in macro and meal rules."
    >
      <SectionHeader title="Preferences" />
      <Surface>
        <DiningModeField initial={profile.dining_mode} />
        <div className="hairline-t pt-card mt-card">
          <ChatLanguageField initial={profile.chat_language} />
        </div>
      </Surface>

      <SectionHeader title="Coaching method" />
      <TextRulesForm
        initial={profile.coach_rules}
        action={updateCoachRules}
        maxLength={COACH_RULES_MAX}
        rows={20}
        size="editor"
        mono
        placeholder="Paste the markdown your coach wrote. It replaces the built-in macro and meal rules; the language, length and no-invented-data rules stay."
        ariaLabel="Coach rules"
        savedMessage="Coach rules saved"
        resetMessage="Back to the built-in coaching rules"
        resetLabel="Use the built-in rules"
        confirmTitle="Drop your coaching rules?"
        confirmBody="The coach goes back to the built-in macro and meal rules. What you pasted is deleted."
      />

      <SectionHeader title="Weekly summary" />
      <TextRulesForm
        initial={profile.summary_rules}
        action={updateSummaryRules}
        maxLength={SUMMARY_RULES_MAX}
        rows={8}
        size="md"
        mono
        placeholder="What should your weekly summary focus on? Default: this week's diet and training adherence, plus overall progress since you started, from your InBody scans."
        ariaLabel="Summary rules"
        savedMessage="Summary rules saved"
        resetMessage="Back to the default weekly summary"
        resetLabel="Use the default summary"
        confirmTitle="Drop your summary rules?"
        confirmBody="The coach goes back to the default weekly summary shape. What you wrote is deleted."
      />

      <ListGroup>
        <ListRow
          href="/settings/import"
          icon={FileText}
          label="Import from Markdown"
          hint="Paste a notes file instead of typing rules"
        />
      </ListGroup>
    </Page>
  );
}
