'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { nl } from '@/lib/nl'

export const LoginForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const data = new FormData(e.currentTarget)

    try {
      const res = await signIn('credentials', {
        email: String(data.get('email') ?? ''),
        password: String(data.get('password') ?? ''),
        redirect: false,
      })

      if (res?.error) {
        setError(nl.login.errorInvalid)
        setPending(false)
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError(nl.login.errorGeneric)
      setPending(false)
    }
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

      <div className="space-y-2">
        <label htmlFor="password" className="label block">
          {nl.login.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
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
        {pending ? nl.login.submitting : nl.login.submit}
      </button>
    </form>
  )
}
