import type { UserRole } from '@/db/schema'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    id?: string
    role: UserRole
    orgId: string
    orgName: string
    orgIsDemo: boolean
  }

  interface Session {
    user: {
      id: string
      role: UserRole
      orgId: string
      orgName: string
      orgIsDemo: boolean
    } & DefaultSession['user']
  }
}

// `next-auth/jwt` only re-exports `@auth/core/jwt`, so the JWT interface has to
// be augmented at its source for declaration merging to take effect.
declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    role: UserRole
    orgId: string
    orgName: string
    orgIsDemo: boolean
  }
}
