import { Suspense } from 'react'

import { LoginForm } from '@/components/auth/LoginForm'
import { Wordmark } from '@/components/brand/Logo'
import { nl } from '@/lib/nl'

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      {/* Grid motif — login screen only, never behind data */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/4 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gold/[0.05] blur-[150px]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-streaks" />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-10 flex justify-center">
          <Wordmark size={34} />
        </div>

        <div className="card p-8 shadow-lg">
          <p className="label">{nl.login.eyebrow}</p>
          <h1 className="display mt-3 text-h1 text-foreground">
            {nl.login.title}
          </h1>
          <p className="mt-2 text-body-sm text-muted">{nl.login.subtitle}</p>

          <Suspense fallback={<div className="mt-8 h-[260px]" />}>
            <LoginForm />
          </Suspense>

          <a
            href="#"
            className="mt-6 block text-center text-body-sm text-muted transition-colors duration-fast hover:text-foreground"
          >
            {nl.login.forgot}
          </a>
        </div>

        <p className="mt-8 text-center text-caption text-muted">
          {nl.login.footer}
        </p>
      </div>
    </main>
  )
}
