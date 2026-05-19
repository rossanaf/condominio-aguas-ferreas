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
    const fracaoId = url?.searchParams?.get?.('fracaoId') ?? '';
    const anoParam = url?.searchParams?.get?.('ano');

    const where: any = isAdmin ? {} : { fracaoId: user?.fracaoId ?? '' };
    if (isAdmin && fracaoId) where.fracaoId = fracaoId;

    // Optional filter by year on dataPagamento: includes everything paid in that year,
    // regardless of whether it's for a regular cota, cota extraordinária, or dívida transitada.
    if (anoParam) {
      const anoNum = Number(anoParam);
      if (!Number.isNaN(anoNum)) {
        where.dataPagamento = {
          gte: new Date(`${anoNum}-01-01`),
          lt: new Date(`${anoNum + 1}-01-01`),
        };
      }
    }

    const pagamentos = await prisma.pagamento.findMany({
      where,
      orderBy: { dataPagamento: 'desc' },
      include: { fracao: true, dividaTransitada: { select: { tipo: true } } },
    });

    const serialized = (pagamentos ?? []).map((p: any) => ({
      ...p,
      valor: Number(p?.valor ?? 0),
      dataPagamento: p?.dataPagamento?.toISOString?.() ?? '',
    }));

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error('Pagamentos error:', error);
    return NextResponse.json({ error: 'Erro ao carregar pagamentos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const body = await request.json();
    const { fracaoId, cotaId, cotaIds, cotaExtraId, valor, dataPagamento, metodoPagamento, referencia, observacoes } = body ?? {};
    if (!fracaoId || !valor || !dataPagamento) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 });
    }

    // Support multi-month payments: cotaIds is an array of cota IDs
    const cotaIdList: string[] = cotaIds && Array.isArray(cotaIds) && cotaIds.length > 0
      ? cotaIds
      : (cotaId ? [cotaId] : []);

    // For multi-month: link to first cota for the payment record, mark all as PAGO
    const primaryCotaId = cotaIdList.length > 0 ? cotaIdList[0] : null;

    const pagamento = await prisma.pagamento.create({
      data: {
        fracaoId,
        cotaId: primaryCotaId,
        cotaExtraId: cotaExtraId || null,
        valor: Number(valor),
        dataPagamento: new Date(dataPagamento),
        metodoPagamento: metodoPagamento || 'Transferência',
        referencia: referencia || null,
        observacoes: observacoes || null,
      },
      include: { fracao: true },
    });

    // Mark all selected cotas as PAGO
    if (cotaIdList.length > 0) {
      await prisma.cota.updateMany({
        where: { id: { in: cotaIdList } },
        data: { status: 'PAGO' },
      });
    }

    if (cotaExtraId) {
      await prisma.cotaExtraordinaria.update({ where: { id: cotaExtraId }, data: { pago: true, dataPagamento: new Date(dataPagamento) } });
    }

    return NextResponse.json({ ...pagamento, valor: Number(pagamento?.valor ?? 0), dataPagamento: pagamento?.dataPagamento?.toISOString?.() ?? '' }, { status: 201 });
  } catch (error: any) {
    console.error('Create pagamento error:', error);
    return NextResponse.json({ error: 'Erro ao registar pagamento' }, { status: 500 });
  }
}
