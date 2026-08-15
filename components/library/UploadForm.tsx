'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { uploadFileAction } from '@/app/(app)/library/actions'

export function UploadForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await uploadFileAction(formData)
        formRef.current?.reset()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload mislukt.')
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="flex flex-wrap items-center gap-3">
      <input type="file" name="file" required className="text-body-sm text-foreground" />
      <button type="submit" disabled={pending} className="btn-ghost disabled:opacity-50">
        {pending ? 'Bezig met uploaden…' : 'Uploaden'}
      </button>
      {error && <p className="w-full text-caption text-flame">{error}</p>}
    </form>
  )
}
