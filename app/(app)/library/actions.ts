'use server'

import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'
import { put, del } from '@vercel/blob'

import { db } from '@/db'
import { libraryFiles } from '@/db/schema'
import { recordAudit } from '@/lib/audit'
import { requireMutator } from '@/lib/session'

const MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25MB

export async function uploadFileAction(formData: FormData) {
  const user = await requireMutator('library')

  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('Geen bestand ontvangen.')
  if (file.size === 0) throw new Error('Bestand is leeg.')
  if (file.size > MAX_SIZE_BYTES) throw new Error('Bestand is groter dan 25MB.')

  const pathname = `${user.orgId}/${crypto.randomUUID()}-${file.name}`
  const blob = await put(pathname, file, { access: 'private', contentType: file.type || undefined })

  await db.insert(libraryFiles).values({
    orgId: user.orgId,
    name: file.name,
    blobUrl: blob.url,
    pathname: blob.pathname,
    contentType: file.type || null,
    size: file.size,
    uploadedBy: user.id,
  })

  await recordAudit({ orgId: user.orgId, userId: user.id, action: 'library_file_uploaded', entity: 'library_file', meta: { name: file.name, size: file.size } })

  revalidatePath('/library')
}

export async function deleteFileAction(fileId: string) {
  const user = await requireMutator('library')

  const [file] = await db.select().from(libraryFiles).where(and(eq(libraryFiles.id, fileId), eq(libraryFiles.orgId, user.orgId)))
  if (!file) throw new Error('Bestand niet gevonden.')

  await del(file.pathname)
  await db.delete(libraryFiles).where(eq(libraryFiles.id, fileId))

  await recordAudit({ orgId: user.orgId, userId: user.id, action: 'library_file_deleted', entity: 'library_file', entityId: fileId, meta: { name: file.name } })

  revalidatePath('/library')
}
