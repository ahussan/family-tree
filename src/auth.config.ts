import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export default {
  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize() {
        // Never runs in middleware.
        return null;
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.systemRole = (user as any).systemRole;
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).systemRole = token.systemRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;