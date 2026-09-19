"use client";

import { ImportEmpty } from "@/components/import/ImportEmpty";
import { ImportError } from "@/components/import/ImportError";
import { ImportForm } from "@/components/import/ImportForm";
import { ImportProgress } from "@/components/import/ImportProgress";
import { ImportReview } from "@/components/import/ImportReview";
import { useMdImport } from "@/components/import/useMdImport";

export function MdImportFlow({ today }: { today: string }) {
  const {
    pending,
    running,
    mdText,
    setMdText,
    attachFiles,
    attachments,
    progress,
    files,
    savedCount,
    openSaved,
    error,
    retryConnection,
    cancelExtraction,
    removeAttachment,
    extract,
    days,
    catalogItems,
    facts,
    rules,
    bodyScans,
    warnings,
    included,
    updateMeal,
    toggleMeal,
    toggleWorkout,
    toggleCatalogItem,
    toggleFact,
    toggleRule,
    toggleBodyScan,
    reset,
    commit,
  } = useMdImport();

  if (running && !days) {
    return (
      <ImportProgress
        progress={progress}
        files={files}
        onCancel={cancelExtraction}
      />
    );
  }

  if (error && !days) {
    return (
      <ImportError message={error} onRetry={retryConnection} onBack={reset} />
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
        files={files}
        savedCount={savedCount}
        openSaved={openSaved}
      />
    );
  }

  if (
    days.length === 0 &&
    catalogItems.length === 0 &&
    facts.length === 0 &&
    rules.length === 0 &&
    bodyScans.length === 0
  ) {
    return <ImportEmpty warnings={warnings} onBack={reset} />;
  }

  return (
    <ImportReview
      today={today}
      days={days}
      catalogItems={catalogItems}
      facts={facts}
      rules={rules}
      bodyScans={bodyScans}
      warnings={warnings}
      included={included}
      pending={pending}
      updateMeal={updateMeal}
      toggleMeal={toggleMeal}
      toggleWorkout={toggleWorkout}
      toggleCatalogItem={toggleCatalogItem}
      toggleFact={toggleFact}
      toggleRule={toggleRule}
      toggleBodyScan={toggleBodyScan}
      reset={reset}
      commit={commit}
    />
  );
}
