"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
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
            "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card py-5 shadow-lg outline-none",
            className,
          )}
        >
          <Dialog.Title className="px-5 pr-11 text-center text-title font-medium tracking-(--tracking-snug)">
            {title}
          </Dialog.Title>
          <Dialog.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              className="absolute top-2 right-2"
            >
              <X className="size-[18px]" strokeWidth={1.5} />
            </Button>
          </Dialog.Close>
          {description ? (
            <Dialog.Description className="mt-0.5 px-5 whitespace-pre-line text-meta text-muted-foreground">
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-5">{children}</div>
          {footer ? (
            <div className="hairline-t mt-4 shrink-0 px-5 pt-4">{footer}</div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
