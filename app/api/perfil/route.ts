export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/perfil — obter telefone e morada do utilizador autenticado
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telefone: true, morada: true },
    });

    return NextResponse.json(user ?? { telefone: null, morada: null });
  } catch (error: any) {
    console.error('GET /api/perfil error:', error);
    return NextResponse.json({ error: 'Erro ao obter perfil' }, { status: 500 });
  }
}

// PUT /api/perfil — actualizar telefone e morada do utilizador autenticado
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { telefone, morada } = body ?? {};

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        telefone: telefone !== undefined ? (telefone ? String(telefone).trim() : null) : undefined,
        morada: morada !== undefined ? (morada ? String(morada).trim() : null) : undefined,
      },
      select: { telefone: true, morada: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PUT /api/perfil error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
