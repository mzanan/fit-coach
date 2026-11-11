import { Page } from "@/components/ui/Page";
import { BackupCard } from "@/components/settings/BackupCard";
import { requireUser } from "@/lib/session";

export default async function BackupSettingsPage() {
  await requireUser();

  return (
    <Page
      backHref="/settings"
      backLabel="Back to settings"
      title="Backup"
      description="A JSON copy of everything in this account."
    >
      <BackupCard />
    </Page>
  );
}
