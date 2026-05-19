export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const { id } = params ?? { id: '' };
    if (!id) return NextResponse.json({ error: 'ID em falta' }, { status: 400 });

    const body = await request.json();
    const {
      descricao,
      categoria,
      valor,
      dataEmissao,
      dataPagamento,
      fornecedor,
      numeroFatura,
      paga,
      metodoPagamento,
      observacoes,
    } = body ?? {};

    const updateData: any = {};
    if (descricao !== undefined) updateData.descricao = String(descricao).trim();
    if (categoria !== undefined) updateData.categoria = categoria;
    if (valor !== undefined) updateData.valor = Number(valor);
    if (dataEmissao) updateData.dataEmissao = new Date(dataEmissao);
    if (dataPagamento !== undefined) updateData.dataPagamento = dataPagamento ? new Date(dataPagamento) : null;
    if (fornecedor !== undefined) updateData.fornecedor = fornecedor?.trim?.() ? fornecedor.trim() : null;
    if (numeroFatura !== undefined) updateData.numeroFatura = numeroFatura?.trim?.() ? numeroFatura.trim() : null;
    if (paga !== undefined) updateData.paga = Boolean(paga);
    if (metodoPagamento !== undefined) updateData.metodoPagamento = metodoPagamento?.trim?.() ? metodoPagamento.trim() : null;
    if (observacoes !== undefined) updateData.observacoes = observacoes?.trim?.() ? observacoes.trim() : null;

    // If user is marking as not paid, clear dataPagamento for consistency.
    if (updateData.paga === false) updateData.dataPagamento = null;

    const despesa = await prisma.despesa.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...despesa,
      valor: Number(despesa?.valor ?? 0),
      dataEmissao: despesa?.dataEmissao?.toISOString?.() ?? '',
      dataPagamento: despesa?.dataPagamento?.toISOString?.() ?? null,
    });
  } catch (error: any) {
    console.error('Update despesa error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar despesa' }, { status: 500 });
  }
}
