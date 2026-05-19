export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const movimentos = await prisma.movimentoCaixa.findMany({
      orderBy: { data: 'desc' },
    });
    const serialized = (movimentos ?? []).map((m: any) => ({
      ...m,
      valor: Number(m?.valor ?? 0),
      data: m?.data?.toISOString?.() ?? '',
    }));
    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error('Movimentos caixa error:', error);
    return NextResponse.json({ error: 'Erro ao carregar movimentos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const body = await request.json();
    const { tipo, valor, data, descricao, observacoes } = body ?? {};
    if (!tipo || !valor || !data) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 });
    }
    if (tipo !== 'LEVANTAMENTO' && tipo !== 'DEPOSITO') {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    const movimento = await prisma.movimentoCaixa.create({
      data: {
        tipo,
        valor: Number(valor),
        data: new Date(data),
        descricao: descricao?.trim?.() || null,
        observacoes: observacoes?.trim?.() || null,
      },
    });
    return NextResponse.json(
      { ...movimento, valor: Number(movimento?.valor ?? 0), data: movimento?.data?.toISOString?.() ?? '' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create movimento error:', error);
    return NextResponse.json({ error: 'Erro ao registar movimento' }, { status: 500 });
  }
}
