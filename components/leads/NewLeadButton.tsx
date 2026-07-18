"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createLead } from "@/app/(dashboard)/leads/actions";

export default function NewLeadButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const router = useRouter();
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createLead({ name, email, company, source: "manual" });
      showToast("Lead aangemaakt");
      setOpen(false);
      setName("");
      setEmail("");
      setCompany("");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Aanmaken mislukt", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Nieuwe lead
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nieuwe lead">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijf</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={loading}
              className="input-field"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md"
            >
              Annuleren
            </button>
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? "Bezig..." : "Aanmaken"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
