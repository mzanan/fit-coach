"use client";

import { Dialog } from "radix-ui";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const isDesktop = useMediaQuery("(min-width: 640px)");

  if (!isDesktop) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={footer}
        className={className}
      >
        {children}
      </BottomSheet>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card p-5 shadow-lg outline-none",
            className,
          )}
        >
          <Dialog.Title className="text-center text-title font-medium tracking-(--tracking-snug)">
            {title}
          </Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-0.5 whitespace-pre-line text-meta text-muted-foreground">
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer ? (
            <div className="hairline-t -mx-5 mt-4 shrink-0 px-5 pt-4">{footer}</div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
