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
 * GET /api/notas
 * Lista todas as notas ordenadas por data (mais recentes primeiro).
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const notas = await prisma.nota.findMany({
      orderBy: [{ data: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(
      (notas ?? []).map((n: any) => ({
        id: n?.id ?? '',
        data: n?.data?.toISOString?.() ?? null,
        texto: n?.texto ?? '',
        createdAt: n?.createdAt?.toISOString?.() ?? '',
        updatedAt: n?.updatedAt?.toISOString?.() ?? '',
      })),
    );
  } catch (error: any) {
    console.error('Notas GET error:', error);
    return NextResponse.json({ error: 'Erro ao carregar notas' }, { status: 500 });
  }
}

/**
 * POST /api/notas
 * Body: { data: 'YYYY-MM-DD' | ISO string, texto: string }
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const dataInput = body?.data;
    const texto = (body?.texto ?? '').toString().trim();

    if (!dataInput) return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });
    if (!texto) return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 });
    if (texto.length > 256) {
      return NextResponse.json({ error: 'Texto demasiado longo (máx. 256 caracteres)' }, { status: 400 });
    }

    const parsedDate = new Date(dataInput);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
    }

    const nota = await prisma.nota.create({
      data: { data: parsedDate, texto },
    });

    return NextResponse.json({
      id: nota?.id,
      data: nota?.data?.toISOString?.() ?? null,
      texto: nota?.texto ?? '',
      createdAt: nota?.createdAt?.toISOString?.() ?? '',
      updatedAt: nota?.updatedAt?.toISOString?.() ?? '',
    });
  } catch (error: any) {
    console.error('Notas POST error:', error);
    return NextResponse.json({ error: 'Erro ao criar nota' }, { status: 500 });
  }
}
