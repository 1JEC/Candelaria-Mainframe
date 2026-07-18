"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { toggleSpam, toggleReviewed } from "@/app/(dashboard)/offertes/actions";

export default function SubmissionActions({
  id,
  isSpam,
  reviewed,
  compact = false,
}: {
  id: string;
  isSpam: boolean;
  reviewed: boolean;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();

  function handleReviewed() {
    startTransition(async () => {
      try {
        await toggleReviewed(id, !reviewed);
        showToast(!reviewed ? "Gemarkeerd als verwerkt" : "Markering verwerkt ongedaan gemaakt");
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Mislukt", "error");
      }
    });
  }

  function handleSpam() {
    startTransition(async () => {
      try {
        await toggleSpam(id, !isSpam);
        showToast(!isSpam ? "Gemarkeerd als spam" : "Spam-markering ongedaan gemaakt");
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Mislukt", "error");
      }
    });
  }

  const textClass = compact ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleReviewed}
        disabled={isPending}
        className={`${textClass} font-medium disabled:opacity-50 ${
          reviewed ? "text-gray-500 hover:text-gray-700" : "text-brand-green hover:text-brand-green-dark"
        }`}
      >
        {reviewed ? "Markeer als open" : "Markeer verwerkt"}
      </button>
      <button
        onClick={handleSpam}
        disabled={isPending}
        className={`${textClass} font-medium disabled:opacity-50 ${
          isSpam ? "text-gray-500 hover:text-gray-700" : "text-red-600 hover:text-red-800"
        }`}
      >
        {isSpam ? "Niet spam" : "Markeer spam"}
      </button>
    </div>
  );
}
