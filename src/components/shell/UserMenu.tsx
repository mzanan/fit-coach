"use client";

import { CalendarDays, LogOut, Settings, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/Menu";
import { authClient } from "@/lib/authClient";
import { resetAnalytics } from "@/lib/consent";

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
  const [avatarFailed, setAvatarFailed] = useState(false);

  const initial = (name?.trim() || email).charAt(0).toUpperCase();

  async function signOut() {
    setBusy(true);
    await authClient.signOut();
    resetAnalytics();
    router.replace("/login");
    router.refresh();
  }

  return (
    <MenuRoot>
      <MenuTrigger
        aria-label="Account menu"
        className="flex size-11 items-center justify-center gap-2.5 rounded-full outline-none transition-colors duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring lg:size-auto lg:min-h-11 lg:max-w-64 lg:min-w-0 lg:rounded-control lg:px-2 lg:hover:bg-overlay"
      >
        <span className="hidden min-w-0 flex-1 text-right lg:block">
          <span className="block truncate text-meta font-medium">
            {name || email}
          </span>
          {name ? (
            <span className="block truncate text-eyebrow text-muted-foreground">
              {email}
            </span>
          ) : null}
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline-strong bg-surface-2 text-meta font-medium lg:size-8">
          {image && !avatarFailed ? (
            <Image
              src={image}
              alt=""
              width={36}
              height={36}
              unoptimized
              className="size-full"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            initial
          )}
        </span>
      </MenuTrigger>

      <MenuContent align="end" side="bottom">
        <div className="px-3 py-2 lg:hidden">
          {name ? <p className="text-body font-medium">{name}</p> : null}
          <p className="truncate text-meta text-muted-foreground">{email}</p>
        </div>
        <MenuSeparator className="lg:hidden" />
        <MenuItem asChild className="md:hidden">
          <Link href="/catalog">
            <UtensilsCrossed className="size-[18px]" strokeWidth={1.5} />
            Catalog
          </Link>
        </MenuItem>
        <MenuItem asChild className="md:hidden">
          <Link href="/routine">
            <CalendarDays className="size-[18px]" strokeWidth={1.5} />
            Routine
          </Link>
        </MenuItem>
        <MenuItem asChild className="md:hidden">
          <Link href="/settings">
            <Settings className="size-[18px]" strokeWidth={1.5} />
            Settings
          </Link>
        </MenuItem>
        <MenuItem
          disabled={busy}
          onSelect={(e) => {
            e.preventDefault();
            void signOut();
          }}
          className="text-destructive"
        >
          <LogOut className="size-[18px]" strokeWidth={1.5} />
          Sign out
        </MenuItem>
      </MenuContent>
    </MenuRoot>
  );
}
