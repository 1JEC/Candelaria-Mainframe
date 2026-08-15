import { desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { libraryFiles, users } from '@/db/schema'

export async function listLibraryFiles(orgId: string) {
  return db
    .select({
      id: libraryFiles.id,
      name: libraryFiles.name,
      blobUrl: libraryFiles.blobUrl,
      contentType: libraryFiles.contentType,
      size: libraryFiles.size,
      createdAt: libraryFiles.createdAt,
      uploadedByName: users.name,
    })
    .from(libraryFiles)
    .leftJoin(users, eq(users.id, libraryFiles.uploadedBy))
    .where(eq(libraryFiles.orgId, orgId))
    .orderBy(desc(libraryFiles.createdAt))
}
