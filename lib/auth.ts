import NextAuth, { type NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  }
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex") === hash;
}

export async function generateTOTPSecret(email: string) {
  const secret = speakeasy.generateSecret({
    name: `Mainframe HQ (${email})`,
    issuer: "Candelaria Agency",
    length: 32,
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url || "");
  return { secret: secret.base32, qrCode };
}

export async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.isActive || !user.passwordHash) {
          return null;
        }

        const passwordValid = await verifyPassword(password, user.passwordHash);
        if (!passwordValid) {
          return null;
        }

        if (user.totpSecret) {
          const totp = credentials?.totp;
          if (!totp) {
            throw new Error("TOTP_REQUIRED");
          }
          const totpValid = await verifyTOTP(user.totpSecret, totp);
          if (!totpValid) {
            throw new Error("INVALID_TOTP");
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role ?? "user",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
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
  },
  secret: process.env.NEXTAUTH_SECRET || "demo-secret-key",
};

const handler = NextAuth(authOptions);

export const handlers = {
  GET: handler,
  POST: handler,
};

export const auth = async () => {
  return await getServerSession(authOptions);
};
