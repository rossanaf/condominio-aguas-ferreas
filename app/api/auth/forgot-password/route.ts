import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generic success response (do not reveal whether email exists)
    const genericResponse = NextResponse.json({
      success: true,
      message:
        'Se o email existir no sistema, receberá em breve um email com instruções para repor a password.',
    });

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Do not reveal that the user does not exist
      return genericResponse;
    }

    // Invalidate previous unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    // Generate a secure token (32 bytes)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Build reset link — use runtime NEXTAUTH_URL
    const baseUrl =
      process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
      'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    const userName = user.name ?? 'Condómino';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #0284c7; color: white; padding: 12px 20px; border-radius: 10px; font-size: 18px; font-weight: 700;">
              Condomínio Águas Férreas
            </div>
          </div>
          <h2 style="color: #111827; margin-top: 0;">Recuperação de Password</h2>
          <p style="color: #374151; line-height: 1.6;">Olá ${userName},</p>
          <p style="color: #374151; line-height: 1.6;">
            Recebemos um pedido para repor a password da sua conta associada a <strong>${user.email}</strong>.
          </p>
          <p style="color: #374151; line-height: 1.6;">
            Clique no botão abaixo para definir uma nova password. Este link é válido durante <strong>1 hora</strong>.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #0284c7; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
              Repor Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
            Se o botão não funcionar, copie e cole este endereço no seu navegador:
          </p>
          <p style="color: #0284c7; font-size: 13px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 6px;">
            ${resetUrl}
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 12px; line-height: 1.6;">
            Se não solicitou esta recuperação, pode ignorar este email — a sua password não será alterada.
          </p>
          <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 24px;">
            Email automático — por favor, não responda.<br/>
            Condomínio Águas Férreas
          </p>
        </div>
      </div>
    `;

    try {
      const appUrl = process.env.NEXTAUTH_URL || '';
      const senderEmail = appUrl
        ? `noreply@${new URL(appUrl).hostname}`
        : undefined;

      const response = await fetch(
        'https://apps.abacus.ai/api/sendNotificationEmail',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apiKey: process.env.ABACUSAI_API_KEY ?? '',
          },
          body: JSON.stringify({
            deployment_token: process.env.ABACUSAI_API_KEY,
            app_id: process.env.WEB_APP_ID,
            notification_id: process.env.NOTIF_ID_PASSWORD_RESET,
            subject: 'Recuperação de Password — Condomínio Águas Férreas',
            body: htmlBody,
            is_html: true,
            recipient_email: user.email,
            sender_email: senderEmail,
            sender_alias: 'Condomínio Águas Férreas',
          }),
        }
      );

      const result = await response.json();
      if (!result.success && !result.notification_disabled) {
        console.error('Password reset email failed:', result);
      } else if (result.success) {
        console.log('Password reset email sent to:', user.email);
      }
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      // Do not fail the request — still return generic success
    }

    return genericResponse;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao processar o pedido' },
      { status: 500 }
    );
  }
}
