import { BackupCard } from "@/components/settings/BackupCard";
import { MdImportCard } from "@/components/settings/MdImportCard";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { TargetsForm } from "@/components/settings/TargetsForm";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <TargetsForm profile={profile} />
      <ProfileForm profile={profile} />
      <MdImportCard />
      <BackupCard />
      <SignOutButton />
    </div>
  );
}
