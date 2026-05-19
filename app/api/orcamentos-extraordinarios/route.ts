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
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const ano = searchParams.get('ano') ? Number(searchParams.get('ano')) : new Date().getFullYear();

    const orcamentos = await prisma.orcamentoExtraordinario.findMany({
      where: { ano },
      include: {
        cotas: {
          include: { fracao: { select: { id: true, letra: true, permilagem: true, proprietario: true } } },
          orderBy: { fracao: { letra: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = (orcamentos ?? []).map((o: any) => ({
      ...o,
      valorTotal: Number(o?.valorTotal ?? 0),
      percentagemFR: Number(o?.percentagemFR ?? 0),
      cotas: (o?.cotas ?? []).map((c: any) => ({
        ...c,
        valorTotal: Number(c?.valorTotal ?? 0),
        valorCC: Number(c?.valorCC ?? 0),
        valorFR: Number(c?.valorFR ?? 0),
        dataPagamento: c?.dataPagamento?.toISOString?.() ?? null,
      })),
    }));

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error('OrcExtras GET error:', error);
    return NextResponse.json({ error: 'Erro ao carregar orçamentos extraordinários' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = await request.json();
    const { descricao, valorTotal, percentagemFR, ano, observacoes } = body ?? {};

    if (!descricao || !valorTotal || ano == null) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 });
    }

    const totalVal = Number(valorTotal);
    const frPerc = Number(percentagemFR ?? 0);

    // Fetch all frações to calculate by permilagem
    const fracoes = await prisma.fracao.findMany({ orderBy: { letra: 'asc' } });
    const totalPermilagem = (fracoes ?? []).reduce((acc: number, f: any) => acc + (f?.permilagem ?? 0), 0);

    // Create the extraordinary budget with individual quotas
    const orcamento = await prisma.orcamentoExtraordinario.create({
      data: {
        descricao,
        valorTotal: totalVal,
        percentagemFR: frPerc,
        ano: Number(ano),
        observacoes: observacoes || null,
        cotas: {
          create: (fracoes ?? []).map((f: any) => {
            const fracaoValor = totalPermilagem > 0 ? (totalVal * (f?.permilagem ?? 0)) / totalPermilagem : 0;
            const valorFR = fracaoValor * (frPerc / 100);
            const valorCC = fracaoValor - valorFR;
            return {
              fracaoId: f.id,
              valorTotal: Math.round(fracaoValor * 100) / 100,
              valorCC: Math.round(valorCC * 100) / 100,
              valorFR: Math.round(valorFR * 100) / 100,
            };
          }),
        },
      },
      include: {
        cotas: { include: { fracao: { select: { id: true, letra: true, permilagem: true, proprietario: true } } } },
      },
    });

    return NextResponse.json({
      ...orcamento,
      valorTotal: Number(orcamento?.valorTotal ?? 0),
      percentagemFR: Number(orcamento?.percentagemFR ?? 0),
      cotas: (orcamento?.cotas ?? []).map((c: any) => ({
        ...c,
        valorTotal: Number(c?.valorTotal ?? 0),
        valorCC: Number(c?.valorCC ?? 0),
        valorFR: Number(c?.valorFR ?? 0),
      })),
    });
  } catch (error: any) {
    console.error('OrcExtras POST error:', error);
    return NextResponse.json({ error: 'Erro ao criar orçamento extraordinário' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = await request.json();
    const { cotaExtraId, pago, dataPagamento, pagamentoId } = body ?? {};

    if (!cotaExtraId) {
      return NextResponse.json({ error: 'ID da cota extraordinária obrigatório' }, { status: 400 });
    }

    const cotaExtra = await prisma.cotaExtraordinaria.update({
      where: { id: cotaExtraId },
      data: {
        pago: pago ?? false,
        dataPagamento: dataPagamento ? new Date(dataPagamento) : null,
      },
    });

    return NextResponse.json({
      ...cotaExtra,
      valorTotal: Number(cotaExtra?.valorTotal ?? 0),
      valorCC: Number(cotaExtra?.valorCC ?? 0),
      valorFR: Number(cotaExtra?.valorFR ?? 0),
      dataPagamento: cotaExtra?.dataPagamento?.toISOString?.() ?? null,
    });
  } catch (error: any) {
    console.error('OrcExtras PUT error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar cota extraordinária' }, { status: 500 });
  }
}
