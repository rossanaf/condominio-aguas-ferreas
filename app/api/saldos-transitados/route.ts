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
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const ano = parseInt(searchParams.get('ano') ?? String(new Date().getFullYear()));

    const saldo = await prisma.saldoTransitado.findUnique({ where: { ano } });
    if (!saldo) return NextResponse.json(null);

    return NextResponse.json({
      ...saldo,
      saldoContaCorrente: Number(saldo.saldoContaCorrente ?? 0),
      saldoFundoReserva: Number(saldo.saldoFundoReserva ?? 0),
    });
  } catch (error: any) {
    console.error('Saldos transitados error:', error);
    return NextResponse.json({ error: 'Erro ao carregar saldos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    const body = await request.json();
    const { ano, saldoContaCorrente, saldoFundoReserva, observacoes } = body ?? {};

    if (!ano) {
      return NextResponse.json({ error: 'Ano é obrigatório' }, { status: 400 });
    }

    const saldo = await prisma.saldoTransitado.upsert({
      where: { ano: parseInt(ano) },
      update: {
        saldoContaCorrente: parseFloat(saldoContaCorrente) || 0,
        saldoFundoReserva: parseFloat(saldoFundoReserva) || 0,
        observacoes: observacoes || null,
      },
      create: {
        ano: parseInt(ano),
        saldoContaCorrente: parseFloat(saldoContaCorrente) || 0,
        saldoFundoReserva: parseFloat(saldoFundoReserva) || 0,
        observacoes: observacoes || null,
      },
    });

    return NextResponse.json({
      ...saldo,
      saldoContaCorrente: Number(saldo.saldoContaCorrente ?? 0),
      saldoFundoReserva: Number(saldo.saldoFundoReserva ?? 0),
    });
  } catch (error: any) {
    console.error('Saldos transitados save error:', error);
    return NextResponse.json({ error: 'Erro ao guardar saldos' }, { status: 500 });
  }
}
