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
    const { dataPagamento, metodoPagamento, referencia, observacoes } = body ?? {};

    // Safe edits only: dataPagamento, metodoPagamento, referencia, observacoes.
    // fracaoId, valor and cotaId are intentionally not editable to preserve the link
    // with the Cota(s) marked as PAGO via this payment.
    const updateData: any = {};
    if (dataPagamento) updateData.dataPagamento = new Date(dataPagamento);
    if (metodoPagamento !== undefined) updateData.metodoPagamento = metodoPagamento || 'Transferência';
    if (referencia !== undefined) updateData.referencia = referencia?.trim?.() ? referencia.trim() : null;
    if (observacoes !== undefined) updateData.observacoes = observacoes?.trim?.() ? observacoes.trim() : null;

    const pagamento = await prisma.pagamento.update({
      where: { id },
      data: updateData,
      include: { fracao: true },
    });

    return NextResponse.json({
      ...pagamento,
      valor: Number(pagamento?.valor ?? 0),
      dataPagamento: pagamento?.dataPagamento?.toISOString?.() ?? '',
    });
  } catch (error: any) {
    console.error('Update pagamento error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar pagamento' }, { status: 500 });
  }
}
