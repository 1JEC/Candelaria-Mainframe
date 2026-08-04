import { and, asc, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  changelogEntries,
  requestComments,
  requests,
  users,
} from '@/db/schema'

/** Read models for the Requests module and the dashboard changelog feed. */

export async function listRequests(orgId: string) {
  return db
    .select({
      id: requests.id,
      title: requests.title,
      description: requests.description,
      priority: requests.priority,
      status: requests.status,
      createdAt: requests.createdAt,
      updatedAt: requests.updatedAt,
      authorName: users.name,
      commentCount: db.$count(
        requestComments,
        eq(requestComments.requestId, requests.id),
      ),
    })
    .from(requests)
    .leftJoin(users, eq(users.id, requests.userId))
    .where(eq(requests.orgId, orgId))
    .orderBy(desc(requests.createdAt))
}

export async function getRequest(orgId: string, id: string) {
  const [row] = await db
    .select({
      id: requests.id,
      title: requests.title,
      description: requests.description,
      priority: requests.priority,
      status: requests.status,
      createdAt: requests.createdAt,
      updatedAt: requests.updatedAt,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(requests)
    .leftJoin(users, eq(users.id, requests.userId))
    .where(and(eq(requests.orgId, orgId), eq(requests.id, id)))
    .limit(1)

  if (!row) return null

  const comments = await db
    .select({
      id: requestComments.id,
      body: requestComments.body,
      createdAt: requestComments.createdAt,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(requestComments)
    .leftJoin(users, eq(users.id, requestComments.userId))
    .where(eq(requestComments.requestId, id))
    .orderBy(asc(requestComments.createdAt))

  return { ...row, comments }
}

export async function listChangelog(orgId: string, limit = 8) {
  return db
    .select({
      id: changelogEntries.id,
      weekLabel: changelogEntries.weekLabel,
      entry: changelogEntries.entry,
      createdAt: changelogEntries.createdAt,
    })
    .from(changelogEntries)
    .where(eq(changelogEntries.orgId, orgId))
    .orderBy(desc(changelogEntries.createdAt))
    .limit(limit)
}
