import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/fracoes') || pathname.startsWith('/api/pagamentos') || pathname.startsWith('/api/despesas') || pathname.startsWith('/api/orcamento') || pathname.startsWith('/api/recibos') || pathname.startsWith('/api/relatorios') || pathname.startsWith('/api/orcamentos-extraordinarios') || pathname.startsWith('/api/outras-dividas') || pathname.startsWith('/api/notas') || pathname.startsWith('/api/cotas-atrasadas')) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/api/fracoes/:path*', '/api/pagamentos/:path*', '/api/despesas/:path*', '/api/orcamento/:path*', '/api/recibos/:path*', '/api/recibos-despesas/:path*', '/api/relatorios/:path*', '/api/saldos-transitados/:path*', '/api/dividas-transitadas/:path*', '/api/orcamentos-extraordinarios/:path*', '/api/outras-dividas/:path*', '/api/notas/:path*', '/api/cotas-atrasadas/:path*'],
};
