export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    const isAdmin = user?.role === 'ADMIN';

    const where = isAdmin ? {} : { id: user?.fracaoId ?? '' };
    const fracoes = await prisma.fracao.findMany({
      where,
      orderBy: { letra: 'asc' },
      include: { user: { select: { id: true, name: true, email: true, telefone: true, morada: true } }, _count: { select: { cotas: true, pagamentos: true } } },
    });

    const serialized = (fracoes ?? []).map((f: any) => ({
      ...f,
      user: f?.user ?? null,
      _count: f?._count ?? { cotas: 0, pagamentos: 0 },
    }));

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error('Fracoes error:', error);
    return NextResponse.json({ error: 'Erro ao carregar frações' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const body = await request.json();
    const { id, proprietario, descricao } = body ?? {};
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    const fracao = await prisma.fracao.update({ where: { id }, data: { proprietario, descricao } });
    return NextResponse.json(fracao);
  } catch (error: any) {
    console.error('Update fracao error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar fração' }, { status: 500 });
  }
}
