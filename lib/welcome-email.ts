// Helper to send welcome/access emails for users created by the admin.
// Used both when creating a new user and when resetting a password (optional).

type WelcomeEmailParams = {
  recipientEmail: string;
  recipientName: string | null;
  plainPassword: string;
  mustChangePassword: boolean;
  /** Optional custom subject. Defaults to a welcome subject. */
  subject?: string;
  /** Optional intro paragraph override. */
  introHtml?: string;
};

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendWelcomeEmail(
  params: WelcomeEmailParams
): Promise<{ success: boolean; error?: string }> {
  const {
    recipientEmail,
    recipientName,
    plainPassword,
    mustChangePassword,
    subject = 'Acesso ao sistema — Condomínio Águas Férreas',
    introHtml,
  } = params;

  const baseUrl =
    (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '') || 'http://localhost:3000';
  const loginUrl = `${baseUrl}/login`;
  const displayName = recipientName?.trim() || 'Condómino';

  const defaultIntro = `
    <p style="color: #374151; line-height: 1.6;">Olá ${escapeHtml(displayName)},</p>
    <p style="color: #374151; line-height: 1.6;">
      Foi criada uma conta de acesso para si na plataforma de gestão do
      <strong>Condomínio Águas Férreas</strong>. Em baixo encontra as credenciais iniciais:
    </p>`;

  const intro = introHtml ?? defaultIntro;

  const forceChangeBlock = mustChangePassword
    ? `
    <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin: 20px 0; color: #92400e; font-size: 13px; line-height: 1.6;">
      <strong>Importante:</strong> Por segurança, a aplicação irá pedir-lhe para <strong>definir uma nova password no primeiro acesso</strong>.
    </div>`
    : '';

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #0284c7; color: white; padding: 12px 20px; border-radius: 10px; font-size: 18px; font-weight: 700;">
            Condomínio Águas Férreas
          </div>
        </div>
        <h2 style="color: #111827; margin-top: 0;">Bem-vindo(a) à plataforma</h2>
        ${intro}

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; width: 110px;">Email</td>
              <td style="padding: 6px 0; color: #111827; font-weight: 600;">${escapeHtml(recipientEmail)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; vertical-align: top;">Password</td>
              <td style="padding: 6px 0; color: #111827; font-weight: 600;">
                <span style="font-family: 'Courier New', monospace; background: #fff; border: 1px dashed #d1d5db; border-radius: 6px; padding: 4px 10px; display: inline-block;">${escapeHtml(plainPassword)}</span>
              </td>
            </tr>
          </table>
        </div>

        ${forceChangeBlock}

        <div style="text-align: center; margin: 28px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: #0284c7; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Aceder à plataforma
          </a>
        </div>

        <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
          Se o botão não funcionar, copie e cole este endereço no seu navegador:
        </p>
        <p style="color: #0284c7; font-size: 13px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 6px;">
          ${loginUrl}
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px; line-height: 1.6;">
          Se não reconhece este convite, por favor ignore este email ou contacte o administrador do condomínio.
        </p>
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 24px;">
          Email automático — por favor, não responda.<br/>
          Condomínio Águas Férreas
        </p>
      </div>
    </div>
  `;

  try {
    const appUrl = process.env.NEXTAUTH_URL ?? '';
    const senderEmail = appUrl ? `noreply@${new URL(appUrl).hostname}` : undefined;

    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apiKey: process.env.ABACUSAI_API_KEY ?? '',
      },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_BOASVINDAS_AO_SISTEMA,
        subject,
        body: htmlBody,
        is_html: true,
        recipient_email: recipientEmail,
        sender_email: senderEmail,
        sender_alias: 'Condomínio Águas Férreas',
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (result?.success) {
      return { success: true };
    }
    if (result?.notification_disabled) {
      return { success: false, error: 'Tipo de notificação desativada' };
    }
    console.error('Welcome email failed:', result);
    return { success: false, error: result?.error ?? 'Falha ao enviar email' };
  } catch (err: any) {
    console.error('Welcome email error:', err);
    return { success: false, error: err?.message ?? 'Erro ao enviar email' };
  }
}
