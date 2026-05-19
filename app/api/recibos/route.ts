export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getNextReciboNumber(ano: number): Promise<string> {
  const count = await prisma.pagamento.count({
    where: {
      numeroRecibo: { startsWith: `CAF-RCB-${ano}-` },
    },
  });
  const seq = String(count + 1).padStart(2, '0');
  return `CAF-RCB-${ano}-${seq}`;
}

function generateReceiptHTML(pagamento: any, fracao: any, numeroRecibo: string): string {
  const dataPag = new Date(pagamento?.dataPagamento ?? Date.now());
  const dataFormatada = dataPag?.toLocaleDateString?.('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' }) ?? '';
  const valor = Number(pagamento?.valor ?? 0)?.toFixed?.(2) ?? '0.00';
  const dataEmissao = new Date()?.toLocaleDateString?.('pt-PT') ?? '';

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; padding: 40px; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { font-size: 22px; color: #0284c7; margin-bottom: 4px; }
    .header p { font-size: 12px; color: #666; }
    .divider { height: 3px; background: #0284c7; margin: 15px 0 25px; }
    .recibo-num { background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; padding: 10px; text-align: center; width: 260px; margin: 0 auto 25px; }
    .recibo-num span { font-size: 16px; color: #0284c7; font-weight: 600; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px; }
    .info-box { background: #fafafa; border-radius: 6px; padding: 12px 14px; }
    .info-box .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .info-box .value { font-size: 13px; font-weight: 500; }
    .valor-box { background: #ffffff; border: 2px solid #0284c7; border-radius: 10px; padding: 20px; text-align: center; margin: 25px 60px; }
    .valor-box .label { font-size: 11px; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 6px; }
    .valor-box .amount { font-size: 32px; color: #000000; font-weight: 700; }
    .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #888; }
    .footer p { margin-bottom: 3px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Condomínio Águas Férreas</h1>
    <p>Recibo de Pagamento</p>
  </div>
  <div class="divider"></div>
  <div class="recibo-num"><span>${numeroRecibo}</span></div>
  <div class="info-grid">
    <div class="info-box"><div class="label">Fração</div><div class="value">${fracao?.letra ?? 'N/A'}</div></div>
    <div class="info-box"><div class="label">Proprietário</div><div class="value">${fracao?.proprietario ?? 'N/A'}</div></div>
    <div class="info-box"><div class="label">Data de Pagamento</div><div class="value">${dataFormatada}</div></div>
    <div class="info-box"><div class="label">Método</div><div class="value">${pagamento?.metodoPagamento ?? 'Transferência'}</div></div>
    ${pagamento?.referencia ? `<div class="info-box"><div class="label">Referência</div><div class="value">${pagamento.referencia}</div></div>` : ''}
    ${pagamento?.observacoes ? `<div class="info-box"><div class="label">Observações</div><div class="value">${pagamento.observacoes}</div></div>` : ''}
  </div>
  <div class="valor-box">
    <div class="label">Valor Pago</div>
    <div class="amount">${valor} €</div>
  </div>
  <div class="footer">
    <p>Este recibo foi gerado automaticamente pelo sistema de gestão do Condomínio Águas Férreas.</p>
    <p>Data de emissão: ${dataEmissao}</p>
  </div>
</body>
</html>`;
}

async function generatePdfFromHtml(html: string, filename: string): Promise<Buffer> {
  const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'APIKEY': process.env.ABACUSAI_API_KEY || '' },
    body: JSON.stringify({
      html_content: html,
      pdf_options: { format: 'A4', margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } },
    }),
  });

  if (!createResponse.ok) {
    const err = await createResponse.json().catch(() => ({}));
    console.error('HTML2PDF create error:', err);
    throw new Error(err?.error ?? 'Failed to create PDF request');
  }

  const { request_id } = await createResponse.json();
  if (!request_id) throw new Error('No request ID returned');

  const maxAttempts = 60;
  let attempts = 0;
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'APIKEY': process.env.ABACUSAI_API_KEY || '' },
      body: JSON.stringify({ request_id }),
    });
    const statusResult = await statusResponse.json();
    const status = statusResult?.status || 'FAILED';
    const result = statusResult?.result || null;

    if (status === 'SUCCESS') {
      if (result?.result) {
        return Buffer.from(result.result, 'base64');
      }
      throw new Error('PDF generation completed but no result data');
    } else if (status === 'FAILED') {
      throw new Error(result?.error || 'PDF generation failed');
    }
    attempts++;
  }
  throw new Error('PDF generation timed out');
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const body = await request.json();
    const { pagamentoId } = body ?? {};
    if (!pagamentoId) return NextResponse.json({ error: 'ID do pagamento obrigatório' }, { status: 400 });

    const pagamento = await prisma.pagamento.findUnique({ where: { id: pagamentoId }, include: { fracao: true } });
    if (!pagamento) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });

    const user = session?.user as any;
    if (user?.role !== 'ADMIN' && pagamento?.fracaoId !== user?.fracaoId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Get or assign receipt number
    let numeroRecibo = pagamento?.numeroRecibo;
    if (!numeroRecibo) {
      const anoPag = new Date(pagamento?.dataPagamento ?? Date.now()).getFullYear();
      numeroRecibo = await getNextReciboNumber(anoPag);
    }

    const html = generateReceiptHTML(pagamento, pagamento?.fracao, numeroRecibo);
    const pdfBuffer = await generatePdfFromHtml(html, `recibo_${pagamento?.fracao?.letra ?? 'X'}`);

    await prisma.pagamento.update({ where: { id: pagamentoId }, data: { reciboGerado: true, numeroRecibo } });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${numeroRecibo}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Recibo error:', error);
    return NextResponse.json({ error: 'Erro ao gerar recibo: ' + (error?.message ?? '') }, { status: 500 });
  }
}
