export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail } from '@/lib/welcome-email';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        fracaoId: true,
        fracao: { select: { letra: true } },
        telefone: true,
        morada: true,
        createdAt: true,
        lastLoginAt: true,
        mustChangePassword: true,
      },
    });
    return NextResponse.json(users ?? []);
  } catch (error: any) {
    console.error('Users error:', error);
    return NextResponse.json({ error: 'Erro ao carregar utilizadores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const body = await request.json();
    const {
      email,
      name,
      password,
      role,
      fracaoId,
      telefone,
      morada,
      sendWelcomeEmail: shouldSendEmail,
      mustChangePassword,
    } = body ?? {};

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return NextResponse.json({ error: 'Email já registado' }, { status: 409 });

    const newRole = role === 'ADMIN' ? 'ADMIN' : 'CONDOMINO';
    const targetFracaoId = newRole === 'CONDOMINO' && fracaoId ? String(fracaoId) : null;

    // Ensure fraction is available
    if (targetFracaoId) {
      const fracaoOwner = await prisma.user.findUnique({
        where: { fracaoId: targetFracaoId },
      });
      if (fracaoOwner) {
        return NextResponse.json(
          { error: `Esta fração já está associada a ${fracaoOwner.email}` },
          { status: 409 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const mustChange = mustChangePassword !== false; // default true

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        password: hashedPassword,
        role: newRole,
        fracaoId: targetFracaoId,
        telefone: telefone ? String(telefone).trim() : null,
        morada: morada ? String(morada).trim() : null,
        mustChangePassword: mustChange,
      },
      select: { id: true, email: true, name: true, role: true, fracaoId: true },
    });

    // Send welcome email with plain password if requested
    let emailStatus: { sent: boolean; error?: string } = { sent: false };
    if (shouldSendEmail) {
      const result = await sendWelcomeEmail({
        recipientEmail: user.email,
        recipientName: user.name,
        plainPassword: password,
        mustChangePassword: mustChange,
      });
      emailStatus = { sent: result.success, error: result.error };
    }

    return NextResponse.json({ ...user, emailStatus }, { status: 201 });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Erro ao criar utilizador' }, { status: 500 });
  }
}
