"use client";

import { ImportEmpty } from "@/components/import/ImportEmpty";
import { ImportForm } from "@/components/import/ImportForm";
import { ImportProgress } from "@/components/import/ImportProgress";
import { ImportReview } from "@/components/import/ImportReview";
import { useMdImport } from "@/components/import/useMdImport";

export function MdImportFlow({ today }: { today: string }) {
  const {
    pending,
    mdText,
    setMdText,
    attachFiles,
    attachments,
    progress,
    cancelExtraction,
    removeAttachment,
    extract,
    days,
    catalogItems,
    warnings,
    included,
    updateMeal,
    toggleMeal,
    toggleWorkout,
    toggleCatalogItem,
    reset,
    commit,
  } = useMdImport();

  if (pending && !days) {
    return (
      <ImportProgress progress={progress} onCancel={cancelExtraction} />
    );
  }

  if (!days) {
    return (
      <ImportForm
        mdText={mdText}
        setMdText={setMdText}
        pending={pending}
        attachments={attachments}
        attachFiles={attachFiles}
        removeAttachment={removeAttachment}
        extract={extract}
      />
    );
  }

  if (days.length === 0 && catalogItems.length === 0) {
    return <ImportEmpty warnings={warnings} onBack={reset} />;
  }

  return (
    <ImportReview
      today={today}
      days={days}
      catalogItems={catalogItems}
      warnings={warnings}
      included={included}
      pending={pending}
      updateMeal={updateMeal}
      toggleMeal={toggleMeal}
      toggleWorkout={toggleWorkout}
      toggleCatalogItem={toggleCatalogItem}
      reset={reset}
      commit={commit}
    />
  );
}
