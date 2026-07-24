export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import puppeteer from 'puppeteer';


const categorias: Record<string, string> = {
  EDP: 'EDP',
  LIMPEZA: 'Limpeza',
  JARDINAGEM: 'Jardinagem',
  ASSISTENCIA_TECNICA: 'Assistência Técnica',
  DESPESAS_ADMINISTRATIVAS: 'Desp. Administrativas',
  DESPESAS_BANCARIAS: 'Desp. Bancárias',
  FUNDO_RESERVA: 'Fundo de Reserva',
  OUTROS: 'Outros',
};

async function getNextDocumentoNumber(ano: number): Promise<string> {
  const count = await prisma.despesa.count({
    where: {
      numeroDocumento: { startsWith: `CAF-FTR-${ano}-` },
    },
  });
  const seq = String(count + 1).padStart(2, '0');
  return `CAF-FTR-${ano}-${seq}`;
}

function generateExpenseReceiptHTML(despesa: any, numeroDocumento: string): string {
  const dataEmissao = new Date(despesa?.dataEmissao ?? Date.now());
  const dataFormatada = dataEmissao?.toLocaleDateString?.('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' }) ?? '';
  const dataPag = despesa?.dataPagamento ? new Date(despesa.dataPagamento)?.toLocaleDateString?.('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
  const valor = Number(despesa?.valor ?? 0)?.toFixed?.(2) ?? '0.00';
  const dataEmissaoDoc = new Date()?.toLocaleDateString?.('pt-PT') ?? '';

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
    .divider { height: 3px; background: #7f1d1d; margin: 15px 0 25px; }
    .doc-num { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px; text-align: center; width: 280px; margin: 0 auto 25px; }
    .doc-num span { font-size: 16px; color: #7f1d1d; font-weight: 700; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px; }
    .info-box { background: #fafafa; border-radius: 6px; padding: 12px 14px; }
    .info-box .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .info-box .value { font-size: 13px; font-weight: 500; }
    .info-full { grid-column: span 2; }
    .valor-box { background: #f9fafb; border: 2px solid #1a1a2e; border-radius: 10px; padding: 20px; text-align: center; margin: 25px 60px; }
    .valor-box .label { font-size: 11px; color: #555; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .valor-box .amount { font-size: 32px; color: #000; font-weight: 700; }
    .status { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .status-paga { background: #dcfce7; color: #16a34a; }
    .status-pendente { background: #fef3c7; color: #d97706; }
    .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #888; }
    .footer p { margin-bottom: 3px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Condomínio Águas Férreas</h1>
    <p>Documento de Despesa</p>
  </div>
  <div class="divider"></div>
  <div class="doc-num"><span>${numeroDocumento}</span></div>
  <div class="info-grid">
    <div class="info-box info-full"><div class="label">Descrição</div><div class="value">${despesa?.descricao ?? 'N/A'}</div></div>
    <div class="info-box"><div class="label">Categoria</div><div class="value">${categorias[despesa?.categoria ?? ''] ?? despesa?.categoria ?? 'N/A'}</div></div>
    <div class="info-box"><div class="label">Fornecedor</div><div class="value">${despesa?.fornecedor ?? 'N/A'}</div></div>
    <div class="info-box"><div class="label">Data de Emissão</div><div class="value">${dataFormatada}</div></div>
    <div class="info-box"><div class="label">Estado</div><div class="value"><span class="status ${despesa?.paga ? 'status-paga' : 'status-pendente'}">${despesa?.paga ? 'Paga' : 'Pendente'}</span></div></div>
    ${dataPag ? `<div class="info-box"><div class="label">Data de Pagamento</div><div class="value">${dataPag}</div></div>` : ''}
    ${despesa?.numeroFatura ? `<div class="info-box"><div class="label">N.º Fatura</div><div class="value">${despesa.numeroFatura}</div></div>` : ''}
    ${despesa?.observacoes ? `<div class="info-box info-full"><div class="label">Observações</div><div class="value">${despesa.observacoes}</div></div>` : ''}
  </div>
  <div class="valor-box">
    <div class="label">Valor da Despesa</div>
    <div class="amount">${valor} €</div>
  </div>
  <div class="footer">
    <p>Documento gerado automaticamente pelo sistema de gestão do Condomínio Águas Férreas.</p>
    <p>Data de emissão do documento: ${dataEmissaoDoc}</p>
  </div>
</body>
</html>`;
}

async function generatePdfFromHtml(
  html: string,
): Promise<Buffer> {

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'load'
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      }
    });

    return Buffer.from(pdfBuffer);

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = await request.json();
    const { despesaId } = body ?? {};
    if (!despesaId) return NextResponse.json({ error: 'ID da despesa obrigatório' }, { status: 400 });

    const despesa = await prisma.despesa.findUnique({ where: { id: despesaId } });
    if (!despesa) return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 });

    // Get or assign document number
    let numeroDocumento = despesa?.numeroDocumento;
    if (!numeroDocumento) {
      numeroDocumento = await getNextDocumentoNumber(despesa?.ano ?? new Date().getFullYear());
      await prisma.despesa.update({ where: { id: despesaId }, data: { numeroDocumento } });
    }

    const html = generateExpenseReceiptHTML(despesa, numeroDocumento);
    const pdfBuffer = await generatePdfFromHtml(html);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${numeroDocumento}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Despesa PDF error:', error);
    return NextResponse.json({ error: 'Erro ao gerar documento: ' + (error?.message ?? '') }, { status: 500 });
  }
}
