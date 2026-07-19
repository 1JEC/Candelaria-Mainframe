"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { updateIntakeAutoReply } from "@/app/(dashboard)/settings/actions";
import { FORM_TYPE_LABELS } from "@/lib/formTypes";

export default function IntakeAutoReplySettings({
  enabledTypes,
}: {
  enabledTypes: string[];
}) {
  const [selected, setSelected] = useState<string[]>(enabledTypes);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  function toggle(type: string) {
    setSelected((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  async function handleSave() {
    setLoading(true);
    try {
      await updateIntakeAutoReply(selected);
      showToast("Instelling opgeslagen");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Opslaan mislukt", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Verstuur automatisch een bevestigingsmail naar de aanvrager zelf zodra een
        website-aanvraag binnenkomt. Kies voor welke type aanvragen dit moet gebeuren:
      </p>
      <div className="space-y-2">
        {Object.entries(FORM_TYPE_LABELS).map(([value, label]) => (
          <label key={value} className="flex items-center gap-3 min-h-11 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => toggle(value)}
              disabled={loading}
              className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full sm:w-auto btn-primary disabled:opacity-50"
      >
        {loading ? "Opslaan..." : "Opslaan"}
      </button>
      <p className="text-xs text-gray-500">
        Aanvragen met een geblokkeerd e-maildomein/adres (suppressielijst) of die als spam zijn
        gemarkeerd, krijgen nooit een automatische mail.
      </p>
    </div>
  );
}
