"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { completeTask, deleteTask } from "@/app/(dashboard)/outreach/actions";

export default function TaskActions({ id, status }: { id: string; status: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleComplete() {
    setLoading(true);
    try {
      await completeTask(id);
      showToast("Taak afgerond");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Bijwerken mislukt", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteTask(id);
      showToast("Taak verwijderd");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      {status !== "completed" && (
        <button
          onClick={handleComplete}
          disabled={loading}
          className="inline-flex items-center min-h-11 px-2 -mx-2 text-xs text-brand-green hover:text-brand-green-dark font-medium disabled:opacity-50"
        >
          Afronden
        </button>
      )}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center min-h-11 px-2 -mx-2 text-xs text-red-600 hover:text-red-800"
      >
        Verwijderen
      </button>
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="Taak verwijderen"
        description="Weet je zeker dat je deze outreach-taak wilt verwijderen?"
      />
    </div>
  );
}
