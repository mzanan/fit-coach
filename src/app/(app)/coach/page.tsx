import { CoachPanel } from "@/components/coach/CoachPanel";
import { Page } from "@/components/ui/Page";

export default function CoachPage() {
  return (
    <Page
      width="focus"
      title="Coach"
      description="Answers based on what you have logged."
    >
      <CoachPanel />
    </Page>
  );
}
