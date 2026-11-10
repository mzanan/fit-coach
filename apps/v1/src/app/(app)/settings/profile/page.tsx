import { Page } from "@/components/ui/Page";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);

  return (
    <Page
      backHref="/settings"
      backLabel="Back to settings"
      title="Profile"
      description="Used for body metrics and when your day rolls over."
    >
      <ProfileForm profile={profile} />
    </Page>
  );
}
