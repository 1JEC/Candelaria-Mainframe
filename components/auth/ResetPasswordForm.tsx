'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { nl } from '@/lib/nl'

export const ResetPasswordForm = () => {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const data = new FormData(e.currentTarget)
    const password = String(data.get('password') ?? '')
    const confirm = String(data.get('confirm') ?? '')

    if (password !== confirm) {
      setError(nl.resetPassword.errorMismatch)
      setPending(false)
      return
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? nl.resetPassword.errorGeneric)
        setPending(false)
        return
      }

      router.push('/login')
    } catch {
      setError(nl.resetPassword.errorGeneric)
      setPending(false)
    }
  }

  if (!token) {
    return (
      <p className="mt-8 text-body-sm text-foreground">
        {nl.resetPassword.missingToken}
      </p>
    )
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <label htmlFor="password" className="label block">
          {nl.resetPassword.newPassword}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder={nl.login.passwordPlaceholder}
          className="field"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm" className="label block">
          {nl.resetPassword.confirmPassword}
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder={nl.login.passwordPlaceholder}
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
        {pending ? nl.resetPassword.submitting : nl.resetPassword.submit}
      </button>
    </form>
  )
}
