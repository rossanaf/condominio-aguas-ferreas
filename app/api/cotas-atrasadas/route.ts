export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/cotas-atrasadas
 * Lista cotas em dívida (não pagas) de anos anteriores ao ano corrente.
 * Inclui:
 *   - Cotas regulares (tabela Cota) com ano < anoCorrente e status != 'PAGO'
 *   - Dívidas transitadas do tipo 'COTAS' ainda não liquidadas
 * - ADMIN: vê todas.
 * - CONDOMINO: vê apenas as da sua fração.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    const isAdmin = user?.role === 'ADMIN';

    const anoCorrente = new Date().getFullYear();

    // Base filter for regular overdue quotas (previous years, not paid)
    const cotaWhere: any = {
      ano: { lt: anoCorrente },
      status: { not: 'PAGO' },
    };
    const dividaWhere: any = {
      tipo: 'COTAS',
      liquidada: false,
    };

    if (!isAdmin) {
      const fracaoId = user?.fracaoId ?? '';
      if (!fracaoId) {
        return NextResponse.json({ cotas: [], dividas: [], total: 0, count: 0 });
      }
      cotaWhere.fracaoId = fracaoId;
      dividaWhere.fracaoId = fracaoId;
    }

    const [cotas, dividas] = await Promise.all([
      prisma.cota.findMany({
        where: cotaWhere,
        include: { fracao: true },
        orderBy: [{ ano: 'asc' }, { mes: 'asc' }],
      }),
      prisma.dividaTransitada.findMany({
        where: dividaWhere,
        include: { fracao: true },
        orderBy: [{ anoReferencia: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const serializedCotas = (cotas ?? []).map((c: any) => ({
      id: c?.id ?? '',
      fracaoId: c?.fracaoId ?? '',
      fracao: c?.fracao ?? null,
      ano: c?.ano ?? 0,
      mes: c?.mes ?? 0,
      valorTotal: Number(c?.valorTotal ?? 0),
      valorOrcamento: Number(c?.valorOrcamento ?? 0),
      valorFundoReserva: Number(c?.valorFundoReserva ?? 0),
      status: c?.status ?? 'PENDENTE',
    }));

    const serializedDividas = (dividas ?? []).map((d: any) => ({
      id: d?.id ?? '',
      fracaoId: d?.fracaoId ?? '',
      fracao: d?.fracao ?? null,
      descricao: d?.descricao ?? '',
      valor: Number(d?.valor ?? 0),
      anoReferencia: d?.anoReferencia ?? null,
      liquidada: d?.liquidada ?? false,
    }));

    const totalCotas = serializedCotas.reduce((acc: number, c: any) => acc + (c?.valorTotal ?? 0), 0);
    const totalDividas = serializedDividas.reduce((acc: number, d: any) => acc + (d?.valor ?? 0), 0);
    const total = totalCotas + totalDividas;
    const count = serializedCotas.length + serializedDividas.length;

    return NextResponse.json({
      cotas: serializedCotas,
      dividas: serializedDividas,
      total,
      count,
      anoCorrente,
    });
  } catch (error: any) {
    console.error('Cotas atrasadas error:', error);
    return NextResponse.json({ error: 'Erro ao carregar cotas em atraso' }, { status: 500 });
  }
}
