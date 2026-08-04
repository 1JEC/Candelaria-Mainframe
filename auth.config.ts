import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-safe half of the auth config. Contains no database or bcrypt imports so
 * it can run inside middleware; the Credentials provider lives in `auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // `user.id` is optional upstream, but our authorize() always sets it.
        token.id = user.id ?? token.sub ?? ''
        token.role = user.role
        token.orgId = user.orgId
        token.orgName = user.orgName
        token.orgIsDemo = user.orgIsDemo
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.orgId = token.orgId
        session.user.orgName = token.orgName
        session.user.orgIsDemo = token.orgIsDemo
      }
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
