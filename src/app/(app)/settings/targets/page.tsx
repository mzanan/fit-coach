import { PageHeader } from "@/components/ui/PageHeader";
import { TargetsForm } from "@/components/settings/TargetsForm";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function TargetsPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);

  return (
    <div className="space-y-block">
      <PageHeader
        backHref="/settings"
        backLabel="Back to settings"
        title="Macro targets"
        description="What Today measures your intake against."
      />
      <TargetsForm profile={profile} />
    </div>
  );
}
