export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const url = new URL(request.url);
    const ano = Number(url?.searchParams?.get?.('ano') ?? new Date().getFullYear());

    const despesas = await prisma.despesa.findMany({
      where: { ano },
      orderBy: { dataEmissao: 'desc' },
    });

    const serialized = (despesas ?? []).map((d: any) => ({
      ...d,
      valor: Number(d?.valor ?? 0),
      dataEmissao: d?.dataEmissao?.toISOString?.() ?? '',
      dataPagamento: d?.dataPagamento?.toISOString?.() ?? null,
    }));

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error('Despesas error:', error);
    return NextResponse.json({ error: 'Erro ao carregar despesas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const body = await request.json();
    const { descricao, categoria, valor, dataEmissao, dataPagamento, fornecedor, numeroFatura, paga, metodoPagamento, observacoes, ano } = body ?? {};
    if (!descricao || !categoria || !valor || !dataEmissao || !metodoPagamento) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 });
    }

    const despesa = await prisma.despesa.create({
      data: {
        descricao,
        categoria,
        valor: Number(valor),
        dataEmissao: new Date(dataEmissao),
        dataPagamento: dataPagamento ? new Date(dataPagamento) : null,
        fornecedor: fornecedor || null,
        numeroFatura: numeroFatura || null,
        paga: paga ?? false,
        metodoPagamento: metodoPagamento || null,
        observacoes: observacoes || null,
        ano: ano || new Date().getFullYear(),
      },
    });

    return NextResponse.json({ ...despesa, valor: Number(despesa?.valor ?? 0) }, { status: 201 });
  } catch (error: any) {
    console.error('Create despesa error:', error);
    return NextResponse.json({ error: 'Erro ao registar despesa' }, { status: 500 });
  }
}
