// pages/api/auth/[...nextauth].js

import NextAuth from 'next-auth';
import { PrismaClient } from '../../../prisma/generated';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { username, password } = credentials;
        if (!username || !password) return null;

        const user = await prisma.user.findUnique({
          where: { username },
        });
        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, name: user.username, email: user.email };
      }
    }),
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/' },
  debug: process.env.NODE_ENV !== 'production',
  logger: {
    error(code, ...rest) { },
    warn(code, ...rest) { },
    debug(code, ...rest) { },
  },
  events: {
    async signIn(message) {
      console.log('User signed in:', message);
    }
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      }
      return session;
    }
  }
};
console.log("ENV:", process.env.NODE_ENV, process.env.NEXTAUTH_URL);
export default NextAuth(authOptions);