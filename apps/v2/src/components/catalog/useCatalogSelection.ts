"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useAction } from "@/hooks/useAction";
import {
  bulkArchiveCatalogItems,
  bulkDeleteCatalogItems,
  clearCatalog,
} from "@/lib/actions/catalog";

export function useCatalogSelection() {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { pending, run } = useAction();

  function enter() {
    setActive(true);
  }

  function exit() {
    setActive(false);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function archiveSelected() {
    const ids = Array.from(selected);
    run(() => bulkArchiveCatalogItems({ ids }), {
      onDone: (result) => {
        toast.success(
          result.count === 1
            ? "1 item archived"
            : `${result.count} items archived`,
        );
        exit();
      },
    });
  }

  function deleteSelected() {
    const ids = Array.from(selected);
    run(() => bulkDeleteCatalogItems({ ids }), {
      onDone: (result) => {
        toast.success(
          result.count === 1
            ? "1 item deleted"
            : `${result.count} items deleted`,
        );
        exit();
      },
    });
  }

  function clearAll(mode: "archive" | "delete") {
    run(() => clearCatalog({ mode }), {
      onDone: (result) => {
        toast.success(
          mode === "archive"
            ? `${result.count === 1 ? "1 item" : `${result.count} items`} archived`
            : `${result.count === 1 ? "1 item" : `${result.count} items`} deleted`,
        );
        exit();
      },
    });
  }

  return {
    active,
    selected,
    pending,
    enter,
    exit,
    toggle,
    archiveSelected,
    deleteSelected,
    clearAll,
  };
}
