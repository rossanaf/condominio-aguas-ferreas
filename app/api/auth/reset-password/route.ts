import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// GET — validate token (used by the reset-password page)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token em falta' },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { email: true } } },
    });

    if (!record) {
      return NextResponse.json({ valid: false, error: 'Token inválido' });
    }

    if (record.usedAt) {
      return NextResponse.json({
        valid: false,
        error: 'Este link já foi utilizado',
      });
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'Este link expirou. Solicite um novo.',
      });
    }

    return NextResponse.json({
      valid: true,
      email: record.user.email,
    });
  } catch (error) {
    console.error('Validate reset token error:', error);
    return NextResponse.json(
      { valid: false, error: 'Erro ao validar o token' },
      { status: 500 }
    );
  }
}

// POST — set new password
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token em falta' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'A password deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    if (record.usedAt) {
      return NextResponse.json(
        { error: 'Este link já foi utilizado' },
        { status: 400 }
      );
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Este link expirou. Solicite um novo.' },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    // Update password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate any other unused tokens for this user
      prisma.passwordResetToken.updateMany({
        where: {
          userId: record.userId,
          usedAt: null,
          id: { not: record.id },
        },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Password atualizada com sucesso',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar a password' },
      { status: 500 }
    );
  }
}
