"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import { RoutineExerciseForm } from "@/components/routine/RoutineExerciseForm";
import { RoutineExerciseRow } from "@/components/routine/RoutineExerciseRow";
import { useRoutineExercises } from "@/components/routine/useRoutineExercises";
import type { RoutineExercise } from "@/lib/db/schema";

export function RoutineExerciseList({
  label,
  exercises,
}: {
  label: string;
  exercises: RoutineExercise[];
}) {
  const { sorted, pending, save, remove, move } = useRoutineExercises(
    label,
    exercises,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineExercise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoutineExercise | null>(null);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(exercise: RoutineExercise) {
    setEditing(exercise);
    setFormOpen(true);
  }

  return (
    <div className="space-y-tight">
      <p className="eyebrow px-1">{label} exercises</p>

      {sorted.length === 0 ? (
        <EmptyState
          size="sm"
          title="No exercises yet"
          body="Add exercises to build this day's routine."
        />
      ) : (
        <div className="space-y-1.5">
          {sorted.map((exercise, i) => (
            <RoutineExerciseRow
              key={exercise.id}
              exercise={exercise}
              isFirst={i === 0}
              isLast={i === sorted.length - 1}
              onEdit={() => openEdit(exercise)}
              onMove={(direction) => move(exercise.id, direction)}
              onDelete={() => setDeleteTarget(exercise)}
            />
          ))}
        </div>
      )}

      <Button variant="outline" size="md" className="w-full" onClick={openAdd}>
        <Plus className="size-4" />
        Add exercise
      </Button>

      <ResponsiveDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit exercise" : "Add exercise"}
      >
        <RoutineExerciseForm
          initial={editing}
          pending={pending}
          onSubmit={(values) => {
            save(values);
            setFormOpen(false);
          }}
        />
      </ResponsiveDialog>

      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this exercise?"
        body="It is removed from this split. Past logged sessions are untouched."
        confirmLabel="Delete"
        tone="destructive"
        pending={pending}
        onConfirm={() => {
          if (deleteTarget) remove(deleteTarget.id);
        }}
      />
    </div>
  );
}
