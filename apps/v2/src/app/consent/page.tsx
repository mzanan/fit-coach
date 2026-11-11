import type { Metadata } from "next";

import { ConsentForm } from "@/components/auth/ConsentForm";
import { BrandMark } from "@/components/ui/BrandMark";
import { getConsentClient } from "@/lib/mcp/consent";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Authorize access",
  robots: { index: false },
};

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const client = await getConsentClient(await searchParams);

  return (
    <main className="relative flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <BrandMark href="/" className="mb-6" />
        <h1 className="text-h1 font-semibold">Authorize access</h1>
        <div className="mt-block">
          <ConsentForm
            clientName={client.name}
            redirectHost={client.redirectHost}
            scopes={client.scopes}
          />
        </div>
      </div>
    </main>
  );
}
