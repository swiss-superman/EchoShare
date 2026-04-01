import type { NextAuthOptions } from "next-auth";
import NextAuth, { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getGoogleClientCredentials } from "@/lib/google-credentials";
import { getDb } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

function buildHandle(name: string | null | undefined, email: string | null | undefined) {
  const basis = name || email?.split("@")[0] || "waterline-user";
  return slugify(basis).slice(0, 24) || "waterline-user";
}

const db = getDb();
const googleCredentials = getGoogleClientCredentials();
const googleConfigured = Boolean(googleCredentials);

export const authOptions: NextAuthOptions = {
  adapter: db ? PrismaAdapter(db) : undefined,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: db ? "database" : "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: googleConfigured
    ? [
        GoogleProvider({
          clientId: googleCredentials?.clientId ?? "",
          clientSecret: googleCredentials?.clientSecret ?? "",
        }),
      ]
    : [],
  callbacks: {
    async session({ session, user, token }) {
      if (!session.user) {
        return session;
      }

      session.user.id = user?.id ?? token.sub ?? "";
      session.user.role = (user as { role?: string } | undefined)?.role ?? "USER";

      if (db && session.user.id) {
        const profile = await db.profile.findUnique({
          where: { userId: session.user.id },
          select: { handle: true },
        });
        session.user.handle = profile?.handle ?? null;
      } else {
        session.user.handle = null;
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!db || !user.id) {
        return;
      }

      await db.profile.upsert({
        where: { userId: user.id },
        update: {
          displayName: user.name ?? undefined,
        },
        create: {
          userId: user.id,
          handle: buildHandle(user.name, user.email),
          displayName: user.name ?? undefined,
          city: "Unspecified",
          state: "Unspecified",
          country: "India",
        },
      });
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

export async function auth() {
  return getServerSession(authOptions);
}
