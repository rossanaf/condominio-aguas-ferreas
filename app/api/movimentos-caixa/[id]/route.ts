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
    const { tipo, valor, data, descricao, observacoes } = body ?? {};

    const updateData: any = {};
    if (tipo !== undefined) {
      if (tipo !== 'LEVANTAMENTO' && tipo !== 'DEPOSITO') {
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
      }
      updateData.tipo = tipo;
    }
    if (valor !== undefined) updateData.valor = Number(valor);
    if (data !== undefined) updateData.data = new Date(data);
    if (descricao !== undefined) updateData.descricao = descricao?.trim?.() || null;
    if (observacoes !== undefined) updateData.observacoes = observacoes?.trim?.() || null;

    const movimento = await prisma.movimentoCaixa.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...movimento,
      valor: Number(movimento?.valor ?? 0),
      data: movimento?.data?.toISOString?.() ?? '',
    });
  } catch (error: any) {
    console.error('Update movimento error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Movimento não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar movimento' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const { id } = params ?? { id: '' };
    if (!id) return NextResponse.json({ error: 'ID em falta' }, { status: 400 });

    await prisma.movimentoCaixa.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete movimento error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Movimento não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro ao apagar movimento' }, { status: 500 });
  }
}
