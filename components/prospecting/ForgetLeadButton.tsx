'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { forgetLeadAction } from '@/app/(app)/prospecting/actions'
import { nl } from '@/lib/nl'

export function ForgetLeadButton({ leadId }: { leadId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function forget() {
    startTransition(async () => {
      await forgetLeadAction(leadId)
      router.push('/prospecting/leads')
    })
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-caption text-flame underline-offset-4 hover:underline">
        {nl.prospecting.leads.forget}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-caption text-muted">{nl.prospecting.leads.forgetConfirm}</span>
      <button type="button" onClick={forget} disabled={pending} className="rounded-md bg-flame px-3 py-1.5 text-caption text-white disabled:opacity-50">
        {pending ? nl.common.loading : 'Bevestigen'}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-caption text-muted hover:underline">
        {nl.common.cancel}
      </button>
    </div>
  )
}
