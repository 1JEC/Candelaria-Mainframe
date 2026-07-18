"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { deleteLead } from "@/app/(dashboard)/leads/actions";

export default function DeleteLeadButton({
  id,
  name,
  redirectTo,
}: {
  id: string;
  name: string;
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleConfirm() {
    try {
      await deleteLead(id);
      showToast("Lead verwijderd");
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-red-600 hover:text-red-800"
      >
        Verwijderen
      </button>
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Lead verwijderen"
        description={`Weet je zeker dat je "${name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
      />
    </>
  );
}
