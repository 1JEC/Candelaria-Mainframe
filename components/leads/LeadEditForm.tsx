"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { updateLead } from "@/app/(dashboard)/leads/actions";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "won", "lost"];

export default function LeadEditForm({
  lead,
}: {
  lead: { id: string; name: string | null; company: string | null; status: string | null; notes: string | null };
}) {
  const [name, setName] = useState(lead.name || "");
  const [company, setCompany] = useState(lead.company || "");
  const [status, setStatus] = useState(lead.status || "new");
  const [notes, setNotes] = useState(lead.notes || "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateLead(lead.id, { name, company, status, notes });
      showToast("Lead bijgewerkt");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Bijwerken mislukt", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border border-gray-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={loading} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijf</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} disabled={loading} className="input-field" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={loading} className="input-field">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
          rows={4}
          className="input-field"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
        {loading ? "Opslaan..." : "Opslaan"}
      </button>
    </form>
  );
}
