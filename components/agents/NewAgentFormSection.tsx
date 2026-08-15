'use client'

import { useRouter } from 'next/navigation'

import { NewAgentForm } from './NewAgentForm'

/** Thin client wrapper so the (server) list page can render the form without itself needing 'use client' — router.refresh() re-runs getAgentSummaries() to pick up the new row. */
export const NewAgentFormSection = () => {
  const router = useRouter()
  return <NewAgentForm onCreated={() => router.refresh()} />
}
