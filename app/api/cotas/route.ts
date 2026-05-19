export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    const isAdmin = user?.role === 'ADMIN';
    const url = new URL(request.url);
    const ano = Number(url?.searchParams?.get?.('ano') ?? new Date().getFullYear());
    const fracaoId = url?.searchParams?.get?.('fracaoId') ?? '';

    const where: any = { ano };
    if (!isAdmin) where.fracaoId = user?.fracaoId ?? '';
    else if (fracaoId) where.fracaoId = fracaoId;

    const cotas = await prisma.cota.findMany({
      where,
      orderBy: [{ mes: 'asc' }],
      include: { fracao: true },
    });

    // Also load transitioned debts of type "COTAS" for the same year/fraction so
    // overdue quotas registered as DividaTransitada show up alongside regular cotas.
    const whereDividas: any = { tipo: 'COTAS', anoReferencia: ano };
    if (!isAdmin) whereDividas.fracaoId = user?.fracaoId ?? '';
    else if (fracaoId) whereDividas.fracaoId = fracaoId;

    const dividas = await prisma.dividaTransitada.findMany({
      where: whereDividas,
      include: { fracao: true },
      orderBy: [{ createdAt: 'asc' }],
    });

    const serializedCotas = (cotas ?? []).map((c: any) => ({
      ...c,
      valorOrcamento: Number(c?.valorOrcamento ?? 0),
      valorFundoReserva: Number(c?.valorFundoReserva ?? 0),
      valorTotal: Number(c?.valorTotal ?? 0),
      fracao: c?.fracao ?? null,
      isDividaTransitada: false,
    }));

    const serializedDividas = (dividas ?? []).map((d: any) => {
      const valor = Number(d?.valor ?? 0);
      return {
        id: `divida-${d?.id}`,
        ano,
        mes: 0,
        fracaoId: d?.fracaoId ?? null,
        fracao: d?.fracao ?? null,
        valorOrcamento: valor,
        valorFundoReserva: 0,
        valorTotal: valor,
        status: d?.liquidada ? 'PAGO' : 'ATRASADO',
        isDividaTransitada: true,
        descricao: d?.descricao ?? 'Cotas em atraso',
        createdAt: d?.createdAt?.toISOString?.() ?? null,
      };
    });

    return NextResponse.json([...serializedDividas, ...serializedCotas]);
  } catch (error: any) {
    console.error('Cotas error:', error);
    return NextResponse.json({ error: 'Erro ao carregar cotas' }, { status: 500 });
  }
}
