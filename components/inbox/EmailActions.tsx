"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { markEmailRead, archiveEmail } from "@/app/(dashboard)/inbox/actions";

export default function EmailActions({ id, isRead }: { id: string; isRead: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();

  function handleMarkRead() {
    startTransition(async () => {
      try {
        await markEmailRead(id);
        showToast("Gemarkeerd als gelezen");
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Mislukt", "error");
      }
    });
  }

  function handleArchive() {
    startTransition(async () => {
      try {
        await archiveEmail(id);
        showToast("E-mail gearchiveerd");
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Mislukt", "error");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {!isRead && (
        <button
          onClick={handleMarkRead}
          disabled={isPending}
          className="inline-flex items-center min-h-11 px-2 -mx-2 text-xs text-brand-green hover:text-brand-green-dark disabled:opacity-50"
        >
          Markeer gelezen
        </button>
      )}
      <button
        onClick={handleArchive}
        disabled={isPending}
        className="inline-flex items-center min-h-11 px-2 -mx-2 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50"
      >
        Archiveren
      </button>
    </div>
  );
}
