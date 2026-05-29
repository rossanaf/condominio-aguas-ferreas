export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

function toCents(value: any): number {
  if (value == null) return 0;

  // Prisma Decimal costuma ter toNumber()
  if (typeof value === 'object' && typeof (value as any).toNumber === 'function') {
    return Math.round((value as any).toNumber() * 100);
  }

  // string ("123.45") ou number
  const n = typeof value === 'string' ? Number(value) : value;
  return Math.round(Number(n) * 100);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const user = session.user as any;
    const isAdmin = user?.role === 'ADMIN';
    const currentYear = new Date().getFullYear();

    const whereCotas = isAdmin
      ? { ano: currentYear }
      : { ano: currentYear, fracaoId: user?.fracaoId ?? '' };

    const wherePagamentos = isAdmin ? {} : { fracaoId: user?.fracaoId ?? '' };

    const wherePagamentosAno = {
      ...(isAdmin ? {} : { fracaoId: user?.fracaoId ?? '' }),
      dataPagamento: {
        gte: new Date(`${currentYear}-01-01`),
        lt: new Date(`${currentYear + 1}-01-01`),
      },
    };

    // ✅ Lista (take) para UI + Aggregates para totais (não usar take para somar)
    const [
      totalCotas,
      cotasPagas,
      cotasPendentes,
      pagamentos,
      allPagamentosAnoList,
      despesas, // últimas 5 despesas (lista)
      despesasPagasAgg, // total despesas pagas (ano)
      despesasPendentesAgg, // total despesas pendentes (ano)
      orcamento,
      fracoes,
      saldoTransitado,
      dividasPendentes,
      cotasExtrasPendentes,
    ] = await Promise.all([
      prisma.cota.findMany({ where: whereCotas }),
      prisma.cota.count({ where: { ...whereCotas, status: 'PAGO' } }),
      prisma.cota.count({ where: { ...whereCotas, status: { in: ['PENDENTE', 'ATRASADO'] } } }),

      prisma.pagamento.findMany({
        where: wherePagamentos,
        orderBy: { dataPagamento: 'desc' },
        take: 5,
        include: { fracao: true },
      }),

      // Fetch all payments for the year with linked cota/cotaExtra/divida (to know CC/FR split)
      prisma.pagamento.findMany({
        where: wherePagamentosAno,
        select: {
          valor: true,
          cotaId: true,
          cotaExtraId: true,
          dividaTransitadaId: true,
          dividaTransitada: { select: { tipo: true } },
        },
      }),

      // Lista curta: últimas 5 despesas (para mostrar)
      isAdmin
        ? prisma.despesa.findMany({
            where: { ano: currentYear },
            orderBy: { dataEmissao: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      // Total despesas pagas (não depende do take)
      isAdmin
        ? prisma.despesa.aggregate({
            where: { ano: currentYear, paga: true },
            _sum: { valor: true },
          })
        : Promise.resolve({ _sum: { valor: 0 } }),

      // Total despesas pendentes (não depende do take)
      isAdmin
        ? prisma.despesa.aggregate({
            where: { ano: currentYear, paga: false },
            _sum: { valor: true },
          })
        : Promise.resolve({ _sum: { valor: 0 } }),

      prisma.orcamento.findFirst({ where: { ano: currentYear } }),
      isAdmin ? prisma.fracao.findMany({ orderBy: { letra: 'asc' } }) : Promise.resolve([]),
      isAdmin ? prisma.saldoTransitado.findFirst({ where: { ano: currentYear } }) : Promise.resolve(null),

      prisma.dividaTransitada.aggregate({
        where: isAdmin
          ? { liquidada: false }
          : { liquidada: false, fracaoId: user?.fracaoId ?? '' },
        _sum: { valor: true },
      }),

      isAdmin
        ? prisma.cotaExtraordinaria.aggregate({ where: { pago: false }, _sum: { valorTotal: true } })
        : Promise.resolve(null),
    ]);

    const totalDespesasPagas = Number((despesasPagasAgg as any)?._sum?.valor ?? 0);
    const totalDespesasPendentes = Number((despesasPendentesAgg as any)?._sum?.valor ?? 0);
    const totalDespesas = totalDespesasPagas + totalDespesasPendentes;

    // Contagem de dívidas transitadas pendentes de tipo COTAS (usada na contagem de "Cotas Pendentes").
    const dividasCotasCount = await prisma.dividaTransitada.count({
      where: isAdmin
        ? { liquidada: false, tipo: 'COTAS' }
        : { liquidada: false, tipo: 'COTAS', fracaoId: user?.fracaoId ?? '' },
    });

    // Dívidas transitadas pendentes do tipo OBRAS — contagem e soma
    const [outrasDividasCount, outrasDividasAggr] = await Promise.all([
      prisma.dividaTransitada.count({
        where: isAdmin
          ? { liquidada: false, tipo: 'OBRAS' }
          : { liquidada: false, tipo: 'OBRAS', fracaoId: user?.fracaoId ?? '' },
      }),
      prisma.dividaTransitada.aggregate({
        where: isAdmin
          ? { liquidada: false, tipo: 'OBRAS' }
          : { liquidada: false, tipo: 'OBRAS', fracaoId: user?.fracaoId ?? '' },
        _sum: { valor: true },
      }),
    ]);
    const outrasDividasTotal = Number((outrasDividasAggr as any)?._sum?.valor ?? 0);

    // Split de receitas: 10% Fundo Reserva / 90% Conta Corrente.
    // Exceção: dívida transitada do tipo OBRAS vai 100% para a Conta Corrente.
    let receitasCCCents = 0;
    let receitasFRCents = 0;

    for (const pag of (allPagamentosAnoList ?? [])) {
      const valCents = toCents((pag as any)?.valor);

      if ((pag as any)?.dividaTransitadaId && (pag as any)?.dividaTransitada?.tipo === 'OBRAS') {
        receitasCCCents += valCents;
      } else {
        const frCents = Math.round(valCents * 0.10);
        const ccCents = valCents - frCents;
        receitasFRCents += frCents;
        receitasCCCents += ccCents;
      }
    }

    const receitasFR = receitasFRCents / 100;
    const receitasCC = receitasCCCents / 100;
    const totalReceitas = receitasCC + receitasFR;

    const totalPendente = (totalCotas ?? [])
      .filter((c: any) => c?.status !== 'PAGO')
      .reduce((acc: number, c: any) => acc + Number(c?.valorTotal ?? 0), 0);

    // Totais GLOBAIS em euros de cotas pagas/pendentes
    const whereGlobalCotas = isAdmin ? {} : { fracaoId: user?.fracaoId ?? '' };
    const [
      globalCotasPagasAggr,
      globalCotasPendentesAggr,
      globalDividasCotasPagasAggr,
      globalDividasCotasPendentesAggr,
    ] = await Promise.all([
      prisma.cota.aggregate({ where: { ...whereGlobalCotas, status: 'PAGO' }, _sum: { valorTotal: true } }),
      prisma.cota.aggregate({ where: { ...whereGlobalCotas, status: { in: ['PENDENTE', 'ATRASADO'] } }, _sum: { valorTotal: true } }),
      prisma.dividaTransitada.aggregate({
        where: isAdmin
          ? { liquidada: true, tipo: 'COTAS' }
          : { liquidada: true, tipo: 'COTAS', fracaoId: user?.fracaoId ?? '' },
        _sum: { valor: true },
      }),
      prisma.dividaTransitada.aggregate({
        where: isAdmin
          ? { liquidada: false, tipo: 'COTAS' }
          : { liquidada: false, tipo: 'COTAS', fracaoId: user?.fracaoId ?? '' },
        _sum: { valor: true },
      }),
    ]);

    const cotasPagasValor =
      Number((globalCotasPagasAggr as any)?._sum?.valorTotal ?? 0) +
      Number((globalDividasCotasPagasAggr as any)?._sum?.valor ?? 0);

    const cotasPendentesValor =
      Number((globalCotasPendentesAggr as any)?._sum?.valorTotal ?? 0) +
      Number((globalDividasCotasPendentesAggr as any)?._sum?.valor ?? 0);

    // Outras dívidas (OBRAS) — pagas e pendentes
    const [outrasDividasPagasAggr, outrasDividasPendentesAggr] = await Promise.all([
      prisma.dividaTransitada.aggregate({
        where: isAdmin
          ? { liquidada: true, tipo: 'OBRAS' }
          : { liquidada: true, tipo: 'OBRAS', fracaoId: user?.fracaoId ?? '' },
        _sum: { valor: true },
      }),
      prisma.dividaTransitada.aggregate({
        where: isAdmin
          ? { liquidada: false, tipo: 'OBRAS' }
          : { liquidada: false, tipo: 'OBRAS', fracaoId: user?.fracaoId ?? '' },
        _sum: { valor: true },
      }),
    ]);

    const outrasDividasPagasValor = Number((outrasDividasPagasAggr as any)?._sum?.valor ?? 0);
    const outrasDividasPendentesValor = Number((outrasDividasPendentesAggr as any)?._sum?.valor ?? 0);

    // Saldos separados: Conta Corrente e Fundo de Reserva
    const saldoTransitadoCC = Number((saldoTransitado as any)?.saldoContaCorrente ?? 0);
    const saldoTransitadoFR = Number((saldoTransitado as any)?.saldoFundoReserva ?? 0);

    const dividasPendentesValor = Number((dividasPendentes as any)?._sum?.valor ?? 0);
    const cotasExtrasPendentesValor = Number((cotasExtrasPendentes as any)?._sum?.valorTotal ?? 0);

    // Despesas saem da conta corrente (não do FR)
    const saldoCC = saldoTransitadoCC + receitasCC - totalDespesasPagas;
    const saldoFR = saldoTransitadoFR + receitasFR;
    const saldoAtual = saldoCC + saldoFR;

    const serialized = {
      totalReceitas: Number(totalReceitas?.toFixed?.(2) ?? 0),
      totalDespesas: Number(totalDespesas?.toFixed?.(2) ?? 0),
      totalDespesasPagas: Number(totalDespesasPagas?.toFixed?.(2) ?? totalDespesasPagas ?? 0),
      totalDespesasPendentes: Number(totalDespesasPendentes?.toFixed?.(2) ?? totalDespesasPendentes ?? 0),

      saldo: Number(saldoAtual?.toFixed?.(2) ?? 0),
      totalPendente: Number((totalPendente + dividasPendentesValor + cotasExtrasPendentesValor)?.toFixed?.(2) ?? 0),

      cotasPagas: cotasPagas ?? 0,
      cotasPendentes: (cotasPendentes ?? 0) + (dividasCotasCount ?? 0),
      totalCotasCount: (totalCotas as any)?.length ?? 0,

      pagamentosRecentes: (pagamentos ?? []).map((p: any) => ({
        ...p,
        valor: Number(p?.valor ?? 0),
        dataPagamento: p?.dataPagamento?.toISOString?.() ?? '',
        fracao: p?.fracao ?? null,
      })),

      despesasRecentes: (despesas ?? []).map((d: any) => ({
        ...d,
        valor: Number(d?.valor ?? 0),
        dataEmissao: d?.dataEmissao?.toISOString?.() ?? '',
        dataPagamento: d?.dataPagamento?.toISOString?.() ?? null,
      })),

      orcamento: orcamento
        ? {
            ...orcamento,
            valorEDP: Number((orcamento as any)?.valorEDP ?? 0),
            valorLimpeza: Number((orcamento as any)?.valorLimpeza ?? 0),
            valorJardinagem: Number((orcamento as any)?.valorJardinagem ?? 0),
            valorAssistencia: Number((orcamento as any)?.valorAssistencia ?? 0),
            valorAdministrativas: Number((orcamento as any)?.valorAdministrativas ?? 0),
            valorBancarias: Number((orcamento as any)?.valorBancarias ?? 0),
            subtotal: Number((orcamento as any)?.subtotal ?? 0),
            fundoReserva: Number((orcamento as any)?.fundoReserva ?? 0),
            total: Number((orcamento as any)?.total ?? 0),
          }
        : null,

      fracoes: (fracoes ?? []).map((f: any) => ({
        id: f?.id ?? '',
        letra: f?.letra ?? '',
        permilagem: f?.permilagem ?? 0,
        proprietario: f?.proprietario ?? null,
      })),

      saldoTransitado: saldoTransitado
        ? {
            saldoContaCorrente: Number((saldoTransitado as any)?.saldoContaCorrente ?? 0),
            saldoFundoReserva: Number((saldoTransitado as any)?.saldoFundoReserva ?? 0),
          }
        : null,

      dividasPendentesTotal: Number((dividasPendentes as any)?._sum?.valor ?? 0),
      outrasDividasCount: outrasDividasCount ?? 0,
      outrasDividasTotal: Number(outrasDividasTotal?.toFixed?.(2) ?? 0),

      saldoContaCorrente: Number(saldoCC?.toFixed?.(2) ?? 0),
      saldoFundoReserva: Number(saldoFR?.toFixed?.(2) ?? 0),

      receitasCC: Number(receitasCC?.toFixed?.(2) ?? 0),
      receitasFR: Number(receitasFR?.toFixed?.(2) ?? 0),

      cotasPagasValor: Number(cotasPagasValor?.toFixed?.(2) ?? 0),
      cotasPendentesValor: Number(cotasPendentesValor?.toFixed?.(2) ?? 0),

      outrasDividasPagasValor: Number(outrasDividasPagasValor?.toFixed?.(2) ?? 0),
      outrasDividasPendentesValor: Number(outrasDividasPendentesValor?.toFixed?.(2) ?? 0),

      isAdmin,
    };

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 });
  }
}
