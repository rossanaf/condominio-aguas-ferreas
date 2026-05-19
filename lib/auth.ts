import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { fracao: true },
          });
          if (!user || !user.password) return null;
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;

          // Register successful login timestamp (best-effort — do not block login on failure)
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            });
          } catch (e) {
            console.error('Failed to update lastLoginAt:', e);
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            fracaoId: user.fracaoId,
            fracaoLetra: user.fracao?.letra ?? null,
            mustChangePassword: user.mustChangePassword ?? false,
          } as any;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.fracaoId = user.fracaoId;
        token.fracaoLetra = user.fracaoLetra;
        token.mustChangePassword = user.mustChangePassword ?? false;
      }

      // Refresh flag when client calls update({ mustChangePassword: false })
      if (trigger === 'update' && session && typeof session.mustChangePassword === 'boolean') {
        token.mustChangePassword = session.mustChangePassword;
      }

      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.id || token.sub;
        session.user.role = token.role;
        session.user.fracaoId = token.fracaoId;
        session.user.fracaoLetra = token.fracaoLetra;
        session.user.mustChangePassword = token.mustChangePassword ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
