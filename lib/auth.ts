import { compare, hash } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail, getInternalSuperAdminPassword } from "@/lib/config/super-admin";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "velora_default_secret_key_change_in_prod",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const isSuperAdmin = isSuperAdminEmail(email);
        const envSuperAdminPassword = isSuperAdmin ? getInternalSuperAdminPassword() : null;

        let user = await prisma.user.findUnique({
          where: { email },
        });

        // Bootstrap on first login if user does not exist in DB yet
        if (!user && isSuperAdmin && envSuperAdminPassword && password === envSuperAdminPassword) {
          const passwordHash = await hash(password, 12);
          user = await prisma.user.create({
            data: {
              email,
              name: "Tejaswi Roy (Super Admin)",
              passwordHash,
              role: "SUPER_ADMIN",
              tier: "PREMIUM_YEARLY",
              mustChangePassword: false,
            },
          });
        }

        if (!user || !user.passwordHash) {
          return null;
        }

        let isValidPassword = await compare(password, user.passwordHash);

        // If DB hash did not match, check against current environment password for Super Admins
        if (!isValidPassword && isSuperAdmin && envSuperAdminPassword && password === envSuperAdminPassword) {
          isValidPassword = true;
          // Synchronize/heal DB hash to match the current env password
          const updatedHash = await hash(password, 12);
          await prisma.user.update({
            where: { email },
            data: {
              passwordHash: updatedHash,
              role: "SUPER_ADMIN",
              mustChangePassword: false,
            },
          }).catch(() => {});
        }

        if (!isValidPassword) {
          return null;
        }

        // Server-side: determine effective role.
        // SUPER_ADMIN email check is authoritative — never trust DB role alone for this.
        const effectiveRole = isSuperAdmin ? "SUPER_ADMIN" : user.role;
        const mustChangePassword = isSuperAdmin ? false : user.mustChangePassword;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email.split("@")[0],
          image: user.image ?? null,
          role: effectiveRole,
          tier: user.tier,
          mustChangePassword,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.tier = (user as any).tier;
        token.mustChangePassword = (user as any).mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).tier = token.tier;
        (session.user as any).mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
