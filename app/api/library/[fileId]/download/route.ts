import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { get } from '@vercel/blob'

import { auth } from '@/auth'
import { db } from '@/db'
import { libraryFiles } from '@/db/schema'
import { canAccess } from '@/lib/rbac'

/**
 * The Blob store is private (org documents, not public URLs) — every
 * download is proxied through here so it's gated by the same session +
 * org check as the rest of the module. Middleware excludes /api entirely.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const session = await auth()
  if (!session?.user || !canAccess(session.user.role, 'library')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { fileId } = await params
  const [file] = await db.select().from(libraryFiles).where(and(eq(libraryFiles.id, fileId), eq(libraryFiles.orgId, session.user.orgId)))
  if (!file) return NextResponse.json({ error: 'Bestand niet gevonden.' }, { status: 404 })

  const result = await get(file.pathname, { access: 'private' })
  if (!result) return NextResponse.json({ error: 'Bestand niet gevonden in opslag.' }, { status: 404 })

  return new Response(result.stream, {
    headers: {
      'Content-Type': file.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
    },
  })
}
