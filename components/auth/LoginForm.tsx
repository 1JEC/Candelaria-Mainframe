"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorMsg = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        totp: totpRequired ? totp : undefined,
        redirect: false,
      });

      if (!result?.ok) {
        if (result?.error === "TOTP_REQUIRED") {
          setTotpRequired(true);
          setError(null);
        } else if (result?.error === "INVALID_TOTP") {
          setError("Ongeldige authenticatiecode. Probeer opnieuw.");
        } else {
          setError("Ongeldige e-mail of wachtwoord.");
        }
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Er is een fout opgetreden. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand-black mb-2">
            Mainframe HQ
          </h1>
          <p className="text-gray-600">Candelaria Agency Operations Portal</p>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">
              Login mislukt. Controleer je inloggegevens.
            </p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {!totpRequired ? (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold mb-2">
                  E-mailadres
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  placeholder="j.candelaria171@gmail.com"
                  className="input-field"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold mb-2">
                  Wachtwoord
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="TempPassword123!"
                  className="input-field"
                  required
                  disabled={loading}
                />
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="totp" className="block text-sm font-semibold mb-2">
                Authenticatiecode (2FA)
              </label>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="input-field text-center text-2xl tracking-widest"
                required
                disabled={loading}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Voer de 6-cijferige code in van je authenticator-app.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Bezig met inloggen..." : totpRequired ? "Verifiëren" : "Inloggen"}
          </button>
        </form>

      </div>
    </div>
  );
}
