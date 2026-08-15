'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { deleteFileAction } from '@/app/(app)/library/actions'

export function DeleteFileButton({ fileId }: { fileId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function remove() {
    startTransition(async () => {
      await deleteFileAction(fileId)
      router.refresh()
    })
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-caption text-muted hover:text-flame">
        Verwijderen
      </button>
    )
  }

  return (
    <span className="flex items-center gap-2 text-caption">
      <button type="button" onClick={remove} disabled={pending} className="text-flame hover:underline disabled:opacity-50">
        {pending ? 'Bezig…' : 'Bevestigen'}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-muted hover:underline">
        Annuleren
      </button>
    </span>
  )
}
