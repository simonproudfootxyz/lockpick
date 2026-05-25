import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signInSchema } from "./schemas";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    username: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email))
          .limit(1);

        if (!user) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    authorized: async ({ auth, request }) => {
      const pathname = request.nextUrl.pathname;
      if (pathname.startsWith("/account")) {
        return !!auth?.user;
      }
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.username = user.username;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.id) {
        session.user.id = String(token.id);
        session.user.username = String(token.username ?? "");
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
});
