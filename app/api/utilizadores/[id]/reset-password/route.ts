export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail } from '@/lib/welcome-email';

// POST /api/utilizadores/[id]/reset-password — admin define nova password
export async function POST(
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
    const {
      password,
      sendEmail: shouldSendEmail,
      forceChange,
    } = body ?? {};

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'A password deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Utilizador não encontrado' },
        { status: 404 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const mustChange = forceChange !== false; // default true

    // Update password and invalidate any active password-reset tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { password: hashed, mustChangePassword: mustChange },
      }),
      prisma.passwordResetToken.updateMany({
        where: { userId: id, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    // Optionally send email with the new password
    let emailStatus: { sent: boolean; error?: string } = { sent: false };
    if (shouldSendEmail) {
      const result = await sendWelcomeEmail({
        recipientEmail: existing.email,
        recipientName: existing.name,
        plainPassword: password,
        mustChangePassword: mustChange,
        subject: 'A sua password foi reposta — Condomínio Águas Férreas',
        introHtml: `
          <p style="color: #374151; line-height: 1.6;">Olá ${existing.name ?? 'Condómino'},</p>
          <p style="color: #374151; line-height: 1.6;">
            A password da sua conta no <strong>Condomínio Águas Férreas</strong> foi reposta pelo administrador.
            Utilize as credenciais abaixo para aceder à plataforma:
          </p>`,
      });
      emailStatus = { sent: result.success, error: result.error };
    }

    return NextResponse.json({
      success: true,
      message: `Password de ${existing.name ?? existing.email} atualizada com sucesso`,
      emailStatus,
    });
  } catch (error: any) {
    console.error('Admin reset password error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar password' },
      { status: 500 }
    );
  }
}
