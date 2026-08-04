import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'

import { authConfig } from '@/auth.config'
import { MODULES, MODULE_ACCESS, type ModuleKey } from '@/lib/rbac'

// Edge-safe: authConfig has no database or bcrypt imports.
const { auth } = NextAuth(authConfig)

const MODULE_SET = new Set<string>(MODULES)

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
  const path = nextUrl.pathname

  const isLogin = path === '/login'
  const isPublic = isLogin || path === '/forgot-password' || path === '/reset-password'

  if (!session?.user) {
    if (isPublic) return NextResponse.next()
    const url = new URL('/login', nextUrl)
    if (path !== '/') url.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(url)
  }

  // Signed in — never show the login/reset screens again.
  if (isPublic) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // Deny-by-default module gating.
  const segment = path.split('/')[1]
  if (MODULE_SET.has(segment)) {
    const allowed = MODULE_ACCESS[session.user.role]
    if (!allowed.includes(segment as ModuleKey)) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  // Skip Next internals and static files. All of `/api` is excluded: the auth
  // routes handle their own flow and `/api/ingest/*` authenticates with a
  // per-org bearer token, not a session cookie.
  matcher: ['/((?!api|_next/static|_next/image|brand|favicon.ico).*)'],
}
