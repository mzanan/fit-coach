import { AddCatalogItem } from "@/components/catalog/AddCatalogItem";
import { CatalogItemRow } from "@/components/catalog/CatalogItemRow";
import { Surface } from "@/components/ui/Surface";
import { getCatalog } from "@/lib/data/catalog";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function CatalogPage() {
  const user = await requireUser();
  await ensureProfile(user.id);
  const catalog = await getCatalog(user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Catalog</h1>
      {catalog.length === 0 ? (
        <Surface className="p-6 text-center text-sm text-muted-foreground">
          No saved meals. Tap + to add one.
        </Surface>
      ) : (
        <Surface className="divide-y divide-border px-4">
          {catalog.map((item) => (
            <CatalogItemRow key={item.id} item={item} />
          ))}
        </Surface>
      )}
      <AddCatalogItem />
    </div>
  );
}
