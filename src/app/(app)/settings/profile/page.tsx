import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);

  return (
    <div className="space-y-block">
      <PageHeader
        backHref="/settings"
        backLabel="Back to settings"
        title="Profile"
        description="Used for body metrics and when your day rolls over."
      />
      <ProfileForm profile={profile} />
    </div>
  );
}
