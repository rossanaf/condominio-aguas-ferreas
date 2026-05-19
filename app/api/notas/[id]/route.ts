export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session) return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  if (user?.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 }) };
  }
  return { ok: true as const };
}

/**
 * PUT /api/notas/[id]
 * Body: { data?: ISO string, texto?: string }
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const id = params?.id ?? '';
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const updateData: any = {};

    if (body?.data !== undefined && body?.data !== null) {
      const parsedDate = new Date(body.data);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
      }
      updateData.data = parsedDate;
    }

    if (body?.texto !== undefined) {
      const texto = (body.texto ?? '').toString().trim();
      if (!texto) return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 });
      if (texto.length > 256) {
        return NextResponse.json({ error: 'Texto demasiado longo (máx. 256 caracteres)' }, { status: 400 });
      }
      updateData.texto = texto;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
    }

    const nota = await prisma.nota.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: nota?.id,
      data: nota?.data?.toISOString?.() ?? null,
      texto: nota?.texto ?? '',
      createdAt: nota?.createdAt?.toISOString?.() ?? '',
      updatedAt: nota?.updatedAt?.toISOString?.() ?? '',
    });
  } catch (error: any) {
    console.error('Notas PUT error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro ao actualizar nota' }, { status: 500 });
  }
}

/**
 * DELETE /api/notas/[id]
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const id = params?.id ?? '';
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    await prisma.nota.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Notas DELETE error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro ao eliminar nota' }, { status: 500 });
  }
}
