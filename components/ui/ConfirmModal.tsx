"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Verwijderen",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-gray-600 mb-6">{description}</p>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="w-full sm:w-auto min-h-11 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md transition disabled:opacity-50"
        >
          Annuleren
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full sm:w-auto min-h-11 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition disabled:opacity-50"
        >
          {loading ? "Bezig..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
