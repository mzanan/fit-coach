import { AddCatalogItem } from "@/components/catalog/AddCatalogItem";
import { CatalogList } from "@/components/catalog/CatalogList";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCatalog } from "@/lib/data/catalog";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function CatalogPage() {
  const user = await requireUser();
  await ensureProfile(user.id);
  const catalog = await getCatalog(user.id);

  return (
    <div className="space-y-block">
      <PageHeader
        title="Catalog"
        description={catalog.length === 1 ? "1 saved meal" : `${catalog.length} saved meals`}
        action={
          catalog.length > 0 ? (
            <div className="hidden md:block">
              <AddCatalogItem variant="inline" />
            </div>
          ) : undefined
        }
      />
      <CatalogList items={catalog} />
    </div>
  );
}
