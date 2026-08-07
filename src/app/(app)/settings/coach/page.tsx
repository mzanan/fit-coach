import { ChatLanguageField } from "@/components/settings/ChatLanguageField";
import { DiningModeField } from "@/components/settings/DiningModeField";
import { TextRulesForm } from "@/components/settings/TextRulesForm";
import { Page } from "@/components/ui/Page";
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
      <div className="space-y-card">
        <DiningModeField initial={profile.dining_mode} />
        <ChatLanguageField initial={profile.chat_language} />
        <TextRulesForm
          initial={profile.coach_rules}
          action={updateCoachRules}
          maxLength={COACH_RULES_MAX}
          rows={20}
          minHeightClass="min-h-[60vh]"
          placeholder="Paste the markdown your coach wrote. It replaces the built-in macro and meal rules; the language, length and no-invented-data rules stay."
          ariaLabel="Coach rules"
          savedMessage="Coach rules saved"
          resetMessage="Back to the built-in coaching rules"
          resetLabel="Use the built-in rules"
          confirmTitle="Drop your coaching rules?"
          confirmBody="The coach goes back to the built-in macro and meal rules. What you pasted is deleted."
        />
        <div>
          <p className="mb-2 text-body font-medium">Weekly summary</p>
          <TextRulesForm
            initial={profile.summary_rules}
            action={updateSummaryRules}
            maxLength={SUMMARY_RULES_MAX}
            rows={8}
            minHeightClass="min-h-[20vh]"
            placeholder="What should your weekly summary focus on? Default: this week's diet and training adherence, plus overall progress since you started, from your InBody scans."
            ariaLabel="Summary rules"
            savedMessage="Summary rules saved"
            resetMessage="Back to the default weekly summary"
            resetLabel="Use the default summary"
            confirmTitle="Drop your summary rules?"
            confirmBody="The coach goes back to the default weekly summary shape. What you wrote is deleted."
          />
        </div>
      </div>
    </Page>
  );
}
