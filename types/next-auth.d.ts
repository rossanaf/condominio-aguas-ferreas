import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: string;
      fracaoId?: string | null;
      fracaoLetra?: string | null;
      mustChangePassword?: boolean;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    role?: string;
    fracaoId?: string | null;
    fracaoLetra?: string | null;
    mustChangePassword?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: string;
    fracaoId?: string | null;
    fracaoLetra?: string | null;
    mustChangePassword?: boolean;
  }
}