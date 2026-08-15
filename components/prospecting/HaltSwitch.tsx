'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { toggleOutboundHaltAction } from '@/app/(app)/prospecting/actions'
import { nl } from '@/lib/nl'

export function HaltSwitch({ halted: initialHalted }: { halted: boolean }) {
  const [halted, setHalted] = useState(initialHalted)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function toggle() {
    startTransition(async () => {
      await toggleOutboundHaltAction(!halted)
      setHalted(!halted)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3">
      {halted && <span className="text-caption text-flame">{nl.prospecting.outbound.haltActive}</span>}
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`rounded-md border px-4 py-2 text-body-sm transition-colors duration-fast disabled:opacity-50 ${
          halted ? 'border-border text-muted hover:text-foreground' : 'border-flame-line bg-flame-soft text-flame'
        }`}
      >
        {halted ? nl.prospecting.outbound.resume : nl.prospecting.outbound.halt}
      </button>
    </div>
  )
}
