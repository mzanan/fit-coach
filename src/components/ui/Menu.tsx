"use client";

import { DropdownMenu } from "radix-ui";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export const MenuRoot = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

const MENU_ITEM =
  "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-control px-3 text-body outline-none transition-colors duration-(--dur-fast) focus-visible:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-accent";

export function MenuContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={8}
        className={cn(
          "z-50 min-w-56 rounded-xl border border-border bg-popover p-1.5 shadow-raised data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-98 data-[state=closed]:animate-out data-[state=closed]:fade-out duration-(--dur-fast) ease-(--ease-out-soft)",
          className,
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export const MenuItem = forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof DropdownMenu.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenu.Item ref={ref} className={cn(MENU_ITEM, className)} {...props} />
));
MenuItem.displayName = "MenuItem";

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-border" />;
}
