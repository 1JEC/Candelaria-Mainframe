'use client'

import { useState } from 'react'

import { nl } from '@/lib/nl'

export const ForgotPasswordForm = () => {
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const email = String(new FormData(e.currentTarget).get('email') ?? '')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? nl.forgotPassword.errorGeneric)
        setPending(false)
        return
      }

      setDone(true)
      setPending(false)
    } catch {
      setError(nl.forgotPassword.errorGeneric)
      setPending(false)
    }
  }

  if (done) {
    return (
      <p className="mt-8 text-body-sm text-foreground">{nl.forgotPassword.sent}</p>
    )
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <label htmlFor="email" className="label block">
          {nl.login.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={nl.login.emailPlaceholder}
          className="field"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-body-sm text-foreground"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? nl.forgotPassword.submitting : nl.forgotPassword.submit}
      </button>
    </form>
  )
}
