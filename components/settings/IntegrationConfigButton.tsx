"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { saveIntegrationCredential } from "@/app/(dashboard)/settings/actions";

export default function IntegrationConfigButton({
  provider,
  label,
}: {
  provider: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await saveIntegrationCredential(provider, token);
      showToast(`${label} opgeslagen`);
      setOpen(false);
      setToken("");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Opslaan mislukt", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm text-brand-green hover:text-brand-green-dark font-medium">
        Configure
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`${label} configureren`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API-key / token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              disabled={loading}
              placeholder="Plak hier je API-key of token"
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-2">
              Wordt versleuteld opgeslagen. Volledige OAuth-koppeling volgt zodra de bijbehorende
              app-credentials zijn aangeleverd.
            </p>
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
              {loading ? "Bezig..." : "Opslaan"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
