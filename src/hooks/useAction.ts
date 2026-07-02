"use client";

import { useTransition } from "react";
import { toast } from "sonner";

export function useAction() {
  const [pending, startTransition] = useTransition();

  function run(
    fn: () => Promise<unknown>,
    opts?: { success?: string; onDone?: () => void },
  ) {
    startTransition(async () => {
      try {
        await fn();
        if (opts?.success) toast.success(opts.success);
        opts?.onDone?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return { pending, run };
}
