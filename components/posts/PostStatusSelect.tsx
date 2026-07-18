"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { updatePostStatus } from "@/app/(dashboard)/posts/actions";

const STATUS_OPTIONS = ["draft", "scheduled", "approved", "published", "failed"];

export default function PostStatusSelect({ id, status }: { id: string; status: string | null }) {
  const [value, setValue] = useState(status || "draft");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    setValue(newStatus);
    startTransition(async () => {
      try {
        await updatePostStatus(id, newStatus);
        showToast("Status bijgewerkt");
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Bijwerken mislukt", "error");
      }
    });
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={isPending}
      className={`px-2 py-1 rounded text-xs font-medium border-0 ${
        value === "published"
          ? "bg-green-100 text-green-800"
          : value === "scheduled"
            ? "bg-blue-100 text-blue-800"
            : value === "failed"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
      }`}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
