import { PageHeader } from "@/components/ui/PageHeader";
import { BackupCard } from "@/components/settings/BackupCard";
import { requireUser } from "@/lib/session";

export default async function BackupSettingsPage() {
  await requireUser();

  return (
    <div className="space-y-block">
      <PageHeader
        backHref="/settings"
        backLabel="Back to settings"
        title="Backup"
        description="A JSON copy of everything in this account."
      />
      <BackupCard />
    </div>
  );
}
