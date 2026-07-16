import NextAuth from "next-auth";

// TODO: Configure providers (credentials, email magic link, 2FA) in Fase 1
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [],
  pages: {
    signIn: "/login",
    error: "/login?error=true",
  },
  callbacks: {
    async authorized({ auth: userAuth }) {
      return !!userAuth?.user;
    },
  },
});
