export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const url = new URL(request.url);
    const ano = Number(url?.searchParams?.get?.('ano') ?? new Date().getFullYear());

    const orcamento = await prisma.orcamento.findFirst({ where: { ano } });
    if (!orcamento) return NextResponse.json(null);

    return NextResponse.json({
      ...orcamento,
      valorEDP: Number(orcamento?.valorEDP ?? 0),
      valorLimpeza: Number(orcamento?.valorLimpeza ?? 0),
      valorJardinagem: Number(orcamento?.valorJardinagem ?? 0),
      valorAssistencia: Number(orcamento?.valorAssistencia ?? 0),
      valorAdministrativas: Number(orcamento?.valorAdministrativas ?? 0),
      valorBancarias: Number(orcamento?.valorBancarias ?? 0),
      subtotal: Number(orcamento?.subtotal ?? 0),
      fundoReserva: Number(orcamento?.fundoReserva ?? 0),
      total: Number(orcamento?.total ?? 0),
    });
  } catch (error: any) {
    console.error('Orcamento error:', error);
    return NextResponse.json({ error: 'Erro ao carregar orçamento' }, { status: 500 });
  }
}
