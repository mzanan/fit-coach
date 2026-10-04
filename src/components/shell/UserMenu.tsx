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
import { cn } from "@/lib/utils";

export function UserMenu({
  email,
  name,
  image,
  variant = "header",
}: {
  email: string;
  name: string | null;
  image: string | null;
  variant?: "header" | "detailed";
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

  function avatar(size: 32 | 36) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline-strong bg-surface-2 text-meta font-medium",
          size === 32 ? "size-8" : "size-9",
        )}
      >
        {image && !avatarFailed ? (
          <Image
            src={image}
            alt=""
            width={size}
            height={size}
            unoptimized
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          initial
        )}
      </span>
    );
  }

  return (
    <MenuRoot>
      {variant === "detailed" ? (
        <MenuTrigger
          aria-label="Account menu"
          className="flex min-h-11 max-w-64 min-w-0 items-center gap-2.5 rounded-control px-2 outline-none transition-colors duration-(--dur-fast) hover:bg-overlay focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 flex-1 text-right">
            <span className="block truncate text-meta font-medium">
              {name || email}
            </span>
            {name ? (
              <span className="block truncate text-eyebrow text-muted-foreground">
                {email}
              </span>
            ) : null}
          </span>
          {avatar(32)}
        </MenuTrigger>
      ) : (
        <MenuTrigger
          aria-label="Account menu"
          className="flex size-11 items-center justify-center rounded-full outline-none transition-colors duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring"
        >
          {avatar(36)}
        </MenuTrigger>
      )}

      <MenuContent align="end" side="bottom">
        {variant === "detailed" ? null : (
          <>
            <div className="px-3 py-2">
              {name ? <p className="text-body font-medium">{name}</p> : null}
              <p className="truncate text-meta text-muted-foreground">
                {email}
              </p>
            </div>
            <MenuSeparator />
            <MenuItem asChild>
              <Link href="/catalog">
                <UtensilsCrossed className="size-[18px]" strokeWidth={1.5} />
                Catalog
              </Link>
            </MenuItem>
            <MenuItem asChild>
              <Link href="/routine">
                <CalendarDays className="size-[18px]" strokeWidth={1.5} />
                Routine
              </Link>
            </MenuItem>
            <MenuItem asChild>
              <Link href="/settings">
                <Settings className="size-[18px]" strokeWidth={1.5} />
                Settings
              </Link>
            </MenuItem>
          </>
        )}
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
