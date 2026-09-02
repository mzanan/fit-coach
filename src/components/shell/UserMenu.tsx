"use client";

import { Dumbbell, LogOut, Settings, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";

import { authClient } from "@/lib/authClient";
import { cn } from "@/lib/utils";

const ITEM =
  "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-control px-3 text-body outline-none transition-colors duration-(--dur-fast) focus-visible:bg-accent data-[highlighted]:bg-accent";

export function UserMenu({
  email,
  name,
  image,
  variant = "header",
}: {
  email: string;
  name: string | null;
  image: string | null;
  variant?: "header" | "rail";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const initial = (name?.trim() || email).charAt(0).toUpperCase();

  async function signOut() {
    setBusy(true);
    await authClient.signOut();
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
    <DropdownMenu.Root>
      {variant === "rail" ? (
        <DropdownMenu.Trigger
          aria-label="Account menu"
          className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-control px-2 text-left outline-none transition-colors duration-(--dur-fast) hover:bg-overlay focus-visible:ring-2 focus-visible:ring-ring"
        >
          {avatar(32)}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-meta font-medium">
              {name || email}
            </span>
            {name ? (
              <span className="block truncate text-eyebrow text-muted-foreground">
                {email}
              </span>
            ) : null}
          </span>
        </DropdownMenu.Trigger>
      ) : (
        <DropdownMenu.Trigger
          aria-label="Account menu"
          className="rounded-full outline-none transition-colors duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring"
        >
          {avatar(36)}
        </DropdownMenu.Trigger>
      )}

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={variant === "rail" ? "start" : "end"}
          side={variant === "rail" ? "top" : "bottom"}
          sideOffset={8}
          className="z-50 min-w-56 rounded-xl border border-border bg-popover p-1.5 shadow-raised"
        >
          {variant === "rail" ? null : (
            <>
              <div className="px-3 py-2">
                {name ? <p className="text-body font-medium">{name}</p> : null}
                <p className="truncate text-meta text-muted-foreground">
                  {email}
                </p>
              </div>
              <div className="my-1 h-px bg-border" />
              <DropdownMenu.Item asChild>
                <Link href="/catalog" className={ITEM}>
                  <UtensilsCrossed className="size-[18px]" strokeWidth={1.5} />
                  Catalog
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href="/routine" className={ITEM}>
                  <Dumbbell className="size-[18px]" strokeWidth={1.5} />
                  Routine
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href="/settings" className={ITEM}>
                  <Settings className="size-[18px]" strokeWidth={1.5} />
                  Settings
                </Link>
              </DropdownMenu.Item>
            </>
          )}
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
