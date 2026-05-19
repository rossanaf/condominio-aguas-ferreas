export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// PUT /api/utilizadores/[id] — editar utilizador
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { email, name, role, fracaoId, telefone, morada } = body ?? {};

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      );
    }

    // Verify user exists
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Utilizador não encontrado' },
        { status: 404 }
      );
    }

    // If changing email, ensure it is not already in use
    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedEmail !== existing.email) {
      const clash = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (clash) {
        return NextResponse.json(
          { error: 'Já existe um utilizador com esse email' },
          { status: 409 }
        );
      }
    }

    const newRole = role === 'ADMIN' ? 'ADMIN' : 'CONDOMINO';

    // Prevent last admin from downgrading themselves
    if (
      existing.role === 'ADMIN' &&
      newRole === 'CONDOMINO' &&
      existing.id === (session?.user as any)?.id
    ) {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error:
              'Não é possível rebaixar o único administrador do sistema',
          },
          { status: 400 }
        );
      }
    }

    // If a fraction is being assigned, ensure it is free or already this user's
    const targetFracaoId =
      newRole === 'CONDOMINO' && fracaoId ? String(fracaoId) : null;

    if (targetFracaoId) {
      const fracaoOwner = await prisma.user.findUnique({
        where: { fracaoId: targetFracaoId },
      });
      if (fracaoOwner && fracaoOwner.id !== id) {
        return NextResponse.json(
          {
            error: `Esta fração já está associada a outro utilizador (${fracaoOwner.email})`,
          },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        email: normalizedEmail,
        name,
        role: newRole,
        fracaoId: targetFracaoId,
        telefone: telefone !== undefined ? (telefone ? String(telefone).trim() : null) : undefined,
        morada: morada !== undefined ? (morada ? String(morada).trim() : null) : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        fracaoId: true,
        fracao: { select: { letra: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar utilizador' },
      { status: 500 }
    );
  }
}

// DELETE /api/utilizadores/[id] — apagar utilizador
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id } = params;
    const sessionUserId = (session?.user as any)?.id;

    if (id === sessionUserId) {
      return NextResponse.json(
        {
          error:
            'Não é possível apagar a sua própria conta enquanto autenticado',
        },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Utilizador não encontrado' },
        { status: 404 }
      );
    }

    // If deleting an admin, ensure at least one admin remains
    if (existing.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error:
              'Não é possível apagar o único administrador do sistema',
          },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Erro ao apagar utilizador' },
      { status: 500 }
    );
  }
}
