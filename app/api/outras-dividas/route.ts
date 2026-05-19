export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/outras-dividas
 * Returns inherited debts of type 'OBRAS' (labelled as "Outros" in the UI).
 * - ADMIN: sees all debts.
 * - CONDOMINO: sees only debts for their own fraction.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    const isAdmin = user?.role === 'ADMIN';

    const where: any = { tipo: 'OBRAS' };
    if (!isAdmin) {
      const fracaoId = user?.fracaoId ?? '';
      if (!fracaoId) return NextResponse.json([]);
      where.fracaoId = fracaoId;
    }

    const dividas = await prisma.dividaTransitada.findMany({
      where,
      include: {
        fracao: true,
        pagamentos: {
          select: { id: true, numeroRecibo: true, dataPagamento: true, metodoPagamento: true, valor: true },
        },
      },
      orderBy: [{ liquidada: 'asc' }, { anoReferencia: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json((dividas ?? []).map((d: any) => ({
      id: d?.id ?? '',
      fracaoId: d?.fracaoId ?? '',
      fracao: d?.fracao ?? null,
      descricao: d?.descricao ?? '',
      valor: Number(d?.valor ?? 0),
      anoReferencia: d?.anoReferencia ?? null,
      liquidada: d?.liquidada ?? false,
      dataLiquidacao: d?.dataLiquidacao?.toISOString?.() ?? null,
      observacoes: d?.observacoes ?? null,
      pagamento: (d?.pagamentos ?? [])[0]
        ? {
            id: d.pagamentos[0].id,
            numeroRecibo: d.pagamentos[0].numeroRecibo,
            dataPagamento: d.pagamentos[0].dataPagamento?.toISOString?.() ?? null,
            metodoPagamento: d.pagamentos[0].metodoPagamento,
            valor: Number(d.pagamentos[0].valor ?? 0),
          }
        : null,
      createdAt: d?.createdAt?.toISOString?.() ?? '',
    })));
  } catch (error: any) {
    console.error('Outras dívidas error:', error);
    return NextResponse.json({ error: 'Erro ao carregar dívidas' }, { status: 500 });
  }
}
