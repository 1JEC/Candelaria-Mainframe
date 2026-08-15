import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { UploadForm } from '@/components/library/UploadForm'
import { DeleteFileButton } from '@/components/library/DeleteFileButton'
import { listLibraryFiles } from '@/lib/queries/library'
import { formatBytes, formatDateTime } from '@/lib/format'
import { nl } from '@/lib/nl'
import { canMutate } from '@/lib/rbac'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const user = await requireModule('library')
  const files = await listLibraryFiles(user.orgId)

  return (
    <>
      <PageHeader title={nl.modules.library.title} subtitle={nl.modules.library.subtitle} />

      <div className="mt-8 space-y-6">
        {canMutate(user.role) && (
          <div className="card">
            <UploadForm />
            <p className="mt-2 text-caption text-muted">Maximaal 25MB per bestand.</p>
          </div>
        )}

        {files.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="card divide-y divide-border">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <a
                    href={`/api/library/${file.id}/download`}
                    className="block truncate text-body-sm text-foreground underline-offset-4 hover:text-flame hover:underline"
                  >
                    {file.name}
                  </a>
                  <p className="text-caption text-muted">
                    {formatBytes(file.size)} · {file.uploadedByName || 'Onbekend'} · {formatDateTime(file.createdAt)}
                  </p>
                </div>
                {canMutate(user.role) && <DeleteFileButton fileId={file.id} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
