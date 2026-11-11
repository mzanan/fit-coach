"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { CookieConsent } from "@/components/consent/CookieConsent";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast:
              "bg-popover text-popover-foreground border border-border rounded-xl shadow-raised text-body",
            description: "text-meta text-muted-foreground",
            success: "[&_[data-icon]]:text-brand-ink",
            error: "[&_[data-icon]]:text-destructive",
          },
        }}
      />
      <CookieConsent />
    </ThemeProvider>
  );
}
