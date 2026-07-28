"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ListRow } from "@/components/ui/ListRow";
import { authClient } from "@/lib/authClient";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <ListRow
      icon={LogOut}
      label="Sign out"
      tone="danger"
      chevron={false}
      disabled={busy}
      pending={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        router.replace("/login");
        router.refresh();
      }}
    />
  );
}
