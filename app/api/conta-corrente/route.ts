export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // 1. Saldos transitados (soma de todos os anos)
    const saldosTransitados = await prisma.saldoTransitado.findMany();
    let saldoTransitadoCC = 0;
    let saldoTransitadoFR = 0;
    for (const s of saldosTransitados ?? []) {
      saldoTransitadoCC += Number(s?.saldoContaCorrente ?? 0);
      saldoTransitadoFR += Number(s?.saldoFundoReserva ?? 0);
    }
    const saldoTransitadoTotal = saldoTransitadoCC + saldoTransitadoFR;

    // 2. Pagamentos (receitas) agrupados por método
    const pagamentos = await prisma.pagamento.findMany({
      select: { valor: true, metodoPagamento: true },
    });
    let receitasBanco = 0;
    let receitasNumerario = 0;
    for (const p of pagamentos ?? []) {
      const v = Number(p?.valor ?? 0);
      if ((p?.metodoPagamento ?? '').toLowerCase() === 'numerário') {
        receitasNumerario += v;
      } else {
        receitasBanco += v;
      }
    }

    // 3. Despesas pagas agrupadas por método
    const despesas = await prisma.despesa.findMany({
      where: { paga: true },
      select: { valor: true, metodoPagamento: true },
    });
    let despesasBanco = 0;
    let despesasNumerario = 0;
    for (const d of despesas ?? []) {
      const v = Number(d?.valor ?? 0);
      if ((d?.metodoPagamento ?? '').toLowerCase() === 'numerário') {
        despesasNumerario += v;
      } else {
        despesasBanco += v;
      }
    }

    // 4. Movimentos de caixa
    const movimentos = await prisma.movimentoCaixa.findMany({
      select: { tipo: true, valor: true },
    });
    let totalLevantamentos = 0;
    let totalDepositos = 0;
    for (const m of movimentos ?? []) {
      const v = Number(m?.valor ?? 0);
      if (m?.tipo === 'LEVANTAMENTO') totalLevantamentos += v;
      else if (m?.tipo === 'DEPOSITO') totalDepositos += v;
    }

    // 5. Cálculos finais
    const saldoBancario =
      saldoTransitadoTotal + receitasBanco - despesasBanco - totalLevantamentos + totalDepositos;

    const saldoNumerario =
      receitasNumerario - despesasNumerario + totalLevantamentos - totalDepositos;

    // 6. Calcular FR actual: saldoTransitadoFR + 10% de todos os pagamentos de cotas
    // Pagamentos ligados a cotas (cotaId != null ou cotaExtraId != null) ou dívidas tipo COTAS
    const pagamentosParaFR = await prisma.pagamento.findMany({
      select: { valor: true, cotaId: true, cotaExtraId: true, dividaTransitadaId: true },
    });
    let totalFR = saldoTransitadoFR;
    for (const p of pagamentosParaFR ?? []) {
      const v = Number(p?.valor ?? 0);
      if (p?.cotaId || p?.cotaExtraId) {
        totalFR += v * 0.10;
      } else if (p?.dividaTransitadaId) {
        // Check if it's COTAS type
        const divida = await prisma.dividaTransitada.findUnique({
          where: { id: p.dividaTransitadaId },
          select: { tipo: true },
        });
        if (divida?.tipo === 'COTAS') {
          totalFR += v * 0.10;
        }
      }
    }
    // Subtract FR portion of expenses that come from FR (category FUNDO_RESERVA)
    const despesasFR = await prisma.despesa.findMany({
      where: { paga: true, categoria: 'FUNDO_RESERVA' },
      select: { valor: true },
    });
    for (const d of despesasFR ?? []) {
      totalFR -= Number(d?.valor ?? 0);
    }

    return NextResponse.json({
      saldoTransitadoCC,
      saldoTransitadoFR,
      saldoTransitadoTotal,
      receitasBanco,
      receitasNumerario,
      despesasBanco,
      despesasNumerario,
      totalLevantamentos,
      totalDepositos,
      saldoBancario,
      saldoNumerario,
      totalFR,
    });
  } catch (error: any) {
    console.error('Conta corrente error:', error);
    return NextResponse.json({ error: 'Erro ao calcular conta corrente' }, { status: 500 });
  }
}
