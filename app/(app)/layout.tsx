import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

/**
 * Shell for every authenticated module. Middleware already blocks anonymous
 * requests; this second check guarantees `session.user` is defined for the
 * pages below and covers any route the matcher might miss.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { role, name, orgName, orgIsDemo } = session.user
  const userName = name ?? ''

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} userName={userName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          orgName={orgName}
          isDemo={orgIsDemo}
          role={role}
          userName={userName}
        />
        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-content">{children}</div>
        </main>
      </div>
    </div>
  )
}
