"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { startTotpSetup, confirmTotpSetup } from "@/app/(dashboard)/settings/actions";

export default function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const router = useRouter();
  const { showToast } = useToast();

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    try {
      const result = await startTotpSetup();
      setQrCode(result.qrCode);
      setSecret(result.secret);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Kon 2FA-setup niet starten", "error");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!secret) return;
    setLoading(true);
    try {
      await confirmTotpSetup(secret, code);
      showToast("2FA is ingeschakeld");
      setOpen(false);
      setCode("");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Bevestigen mislukt", "error");
    } finally {
      setLoading(false);
    }
  }

  if (enabled) {
    return (
      <p className="text-sm text-gray-600">
        Two-factor authentication (2FA) via TOTP is enabled for your admin account.
      </p>
    );
  }

  return (
    <>
      <button onClick={handleOpen} className="btn-secondary text-sm py-2 px-4">
        Manage 2FA
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="2FA instellen">
        {loading && !qrCode ? (
          <p className="text-sm text-gray-500">QR-code genereren...</p>
        ) : (
          <div className="space-y-4">
            {qrCode && (
              // eslint-disable-next-line @next/next/no-img-element
              <div className="flex justify-center">
                <img src={qrCode} alt="2FA QR-code" width={200} height={200} />
              </div>
            )}
            <p className="text-sm text-gray-600">
              Scan deze QR-code met je authenticator-app en voer de 6-cijferige code in om te bevestigen.
            </p>
            <form onSubmit={handleConfirm} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
                disabled={loading}
                placeholder="000000"
                className="input-field text-center text-2xl tracking-widest"
              />
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="w-full sm:w-auto min-h-11 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md"
                >
                  Annuleren
                </button>
                <button type="submit" disabled={loading} className="w-full sm:w-auto min-h-11 btn-primary disabled:opacity-50">
                  {loading ? "Bezig..." : "Bevestigen"}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </>
  );
}
