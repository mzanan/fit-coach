"use client";

import { useTransition } from "react";
import { toast } from "sonner";

export function useAction() {
  const [pending, startTransition] = useTransition();

  function run<T>(
    fn: () => Promise<T>,
    opts?: {
      success?: string;
      onDone?: (result: T) => void;
      undo?: (result: T) => Promise<void>;
      undoSuccess?: string;
    },
  ) {
    startTransition(async () => {
      try {
        const result = await fn();
        if (opts?.success) {
          if (opts.undo) {
            toast.success(opts.success, {
              duration: 6000,
              action: {
                label: "Undo",
                onClick: () => {
                  void opts
                    .undo!(result)
                    .then(() => {
                      if (opts.undoSuccess) toast(opts.undoSuccess);
                    })
                    .catch((e: unknown) => {
                      toast.error(
                        e instanceof Error ? e.message : "Could not undo",
                      );
                    });
                },
              },
            });
          } else {
            toast.success(opts.success);
          }
        }
        opts?.onDone?.(result);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return { pending, run };
}
