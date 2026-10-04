"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { CookieConsent } from "@/components/consent/CookieConsent";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster position="top-center" richColors />
      <CookieConsent />
    </ThemeProvider>
  );
}
