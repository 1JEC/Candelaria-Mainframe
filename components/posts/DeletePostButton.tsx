"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { deletePost } from "@/app/(dashboard)/posts/actions";

export default function DeletePostButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleConfirm() {
    try {
      await deletePost(id);
      showToast("Post verwijderd");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-red-600 hover:text-red-800">
        Verwijderen
      </button>
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Post verwijderen"
        description="Weet je zeker dat je deze post wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
      />
    </>
  );
}
