import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users, sessions } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

const TOTP_WINDOW = 1; // Allow ±1 time window for TOTP verification

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  // TODO: Use bcryptjs in production
  // For now, simple hash (replace in Fase 1 before production)
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex") === hash;
}

export function hashPassword(password: string): string {
  // TODO: Use bcryptjs: await bcrypt.hash(password, 10)
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function generateTOTPSecret(email: string) {
  const secret = speakeasy.generateSecret({
    name: `Mainframe HQ (${email})`,
    issuer: "Candelaria Agency",
    length: 32,
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  return { secret: secret.base32, qrCode };
}

export async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: TOTP_WINDOW,
  });
}

const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        // Verify password
        const isValid = await verifyPassword(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        // Verify TOTP if admin
        if (user.role === "admin" && user.totpSecret) {
          if (!credentials.totp) {
            throw new Error("TOTP_REQUIRED");
          }

          const isTotpValid = await verifyTOTP(
            user.totpSecret,
            credentials.totp as string
          );

          if (!isTotpValid) {
            throw new Error("INVALID_TOTP");
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
