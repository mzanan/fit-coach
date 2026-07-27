"use client";

import { LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";

import { authClient } from "@/lib/authClient";
import { cn } from "@/lib/utils";

const ITEM =
  "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-3 text-body outline-none transition-colors duration-[--dur-fast] focus-visible:bg-accent data-[highlighted]:bg-accent";

export function UserMenu({
  email,
  name,
  image,
}: {
  email: string;
  name: string | null;
  image: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const initial = (name?.trim() || email).charAt(0).toUpperCase();

  async function signOut() {
    setBusy(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-hairline-strong bg-surface-2 text-meta font-medium transition-colors duration-[--dur-fast] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {image ? (
          <Image src={image} alt="" width={36} height={36} unoptimized />
        ) : (
          initial
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-xl border border-border bg-popover p-1.5 shadow-raised"
        >
          <div className="px-3 py-2">
            {name ? <p className="text-body font-medium">{name}</p> : null}
            <p className="truncate text-meta text-muted-foreground">{email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link href="/settings" className={ITEM}>
              <Settings className="size-[18px]" strokeWidth={1.5} />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            disabled={busy}
            onSelect={(e) => {
              e.preventDefault();
              void signOut();
            }}
            className={cn(ITEM, "text-destructive")}
          >
            <LogOut className="size-[18px]" strokeWidth={1.5} />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
