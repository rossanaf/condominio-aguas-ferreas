export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const data = body?.data;
    if (!data) {
      return NextResponse.json({ error: 'Ficheiro de backup inválido: campo "data" não encontrado' }, { status: 400 });
    }

    const results: string[] = [];

    // 1. Frações (must come before users due to FK)
    if (data.fracoes?.length) {
      for (const f of data.fracoes) {
        await prisma.fracao.upsert({
          where: { id: f.id },
          update: { letra: f.letra, permilagem: f.permilagem, descricao: f.descricao ?? null, proprietario: f.proprietario ?? null },
          create: { id: f.id, letra: f.letra, permilagem: f.permilagem, descricao: f.descricao ?? null, proprietario: f.proprietario ?? null },
        });
      }
      results.push(`${data.fracoes.length} frações`);
    }

    // 2. Orçamentos
    if (data.orcamentos?.length) {
      for (const o of data.orcamentos) {
        const { createdAt, updatedAt, ...rest } = o;
        await prisma.orcamento.upsert({
          where: { id: o.id },
          update: rest,
          create: { ...rest, createdAt: createdAt ? new Date(createdAt) : undefined, updatedAt: updatedAt ? new Date(updatedAt) : undefined },
        });
      }
      results.push(`${data.orcamentos.length} orçamentos`);
    }

    // 3. Saldos Transitados
    if (data.saldosTransitados?.length) {
      for (const s of data.saldosTransitados) {
        const { createdAt, updatedAt, ...rest } = s;
        await prisma.saldoTransitado.upsert({
          where: { id: s.id },
          update: rest,
          create: { ...rest, createdAt: createdAt ? new Date(createdAt) : undefined },
        });
      }
      results.push(`${data.saldosTransitados.length} saldos transitados`);
    }

    // 4. Cotas
    if (data.cotas?.length) {
      for (const c of data.cotas) {
        const { createdAt, updatedAt, ...rest } = c;
        await prisma.cota.upsert({
          where: { id: c.id },
          update: rest,
          create: { ...rest, createdAt: createdAt ? new Date(createdAt) : undefined },
        });
      }
      results.push(`${data.cotas.length} cotas`);
    }

    // 5. Dívidas Transitadas
    if (data.dividasTransitadas?.length) {
      for (const d of data.dividasTransitadas) {
        const { createdAt, updatedAt, ...rest } = d;
        await prisma.dividaTransitada.upsert({
          where: { id: d.id },
          update: rest,
          create: { ...rest, createdAt: createdAt ? new Date(createdAt) : undefined },
        });
      }
      results.push(`${data.dividasTransitadas.length} dívidas transitadas`);
    }

    // 6. Pagamentos
    if (data.pagamentos?.length) {
      for (const p of data.pagamentos) {
        const { createdAt, updatedAt, ...rest } = p;
        await prisma.pagamento.upsert({
          where: { id: p.id },
          update: { ...rest, dataPagamento: new Date(rest.dataPagamento) },
          create: { ...rest, dataPagamento: new Date(rest.dataPagamento), createdAt: createdAt ? new Date(createdAt) : undefined },
        });
      }
      results.push(`${data.pagamentos.length} pagamentos`);
    }

    // 7. Despesas
    if (data.despesas?.length) {
      for (const d of data.despesas) {
        const { createdAt, updatedAt, ...rest } = d;
        await prisma.despesa.upsert({
          where: { id: d.id },
          update: { ...rest, dataEmissao: new Date(rest.dataEmissao), dataPagamento: rest.dataPagamento ? new Date(rest.dataPagamento) : null },
          create: { ...rest, dataEmissao: new Date(rest.dataEmissao), dataPagamento: rest.dataPagamento ? new Date(rest.dataPagamento) : null, createdAt: createdAt ? new Date(createdAt) : undefined },
        });
      }
      results.push(`${data.despesas.length} despesas`);
    }

    // 8. Movimentos Caixa
    if (data.movimentosCaixa?.length) {
      for (const m of data.movimentosCaixa) {
        const { createdAt, updatedAt, ...rest } = m;
        await prisma.movimentoCaixa.upsert({
          where: { id: m.id },
          update: { ...rest, data: new Date(rest.data) },
          create: { ...rest, data: new Date(rest.data), createdAt: createdAt ? new Date(createdAt) : undefined },
        });
      }
      results.push(`${data.movimentosCaixa.length} movimentos de caixa`);
    }

    // 9. Orçamentos Extraordinários
    if (data.orcamentosExtraordinarios?.length) {
      for (const o of data.orcamentosExtraordinarios) {
        const { createdAt, updatedAt, ...rest } = o;
        await prisma.orcamentoExtraordinario.upsert({
          where: { id: o.id },
          update: rest,
          create: { ...rest, createdAt: createdAt ? new Date(createdAt) : undefined },
        });
      }
      results.push(`${data.orcamentosExtraordinarios.length} orçamentos extraordinários`);
    }

    // 10. Cotas Extraordinárias
    if (data.cotasExtraordinarias?.length) {
      for (const c of data.cotasExtraordinarias) {
        const { createdAt, updatedAt, ...rest } = c;
        await prisma.cotaExtraordinaria.upsert({
          where: { id: c.id },
          update: { ...rest, dataPagamento: rest.dataPagamento ? new Date(rest.dataPagamento) : null },
          create: { ...rest, dataPagamento: rest.dataPagamento ? new Date(rest.dataPagamento) : null, createdAt: createdAt ? new Date(createdAt) : undefined },
        });
      }
      results.push(`${data.cotasExtraordinarias.length} cotas extraordinárias`);
    }

    // 11. Notas
    if (data.notas?.length) {
      for (const n of data.notas) {
        const { createdAt, updatedAt, ...rest } = n;
        await prisma.nota.upsert({
          where: { id: n.id },
          update: { ...rest, data: new Date(rest.data) },
          create: { ...rest, data: new Date(rest.data), createdAt: createdAt ? new Date(createdAt) : undefined },
        });
      }
      results.push(`${data.notas.length} notas`);
    }

    return NextResponse.json({
      success: true,
      message: `Restauro concluído: ${results.join(', ')}`,
      details: results,
    });
  } catch (error: any) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: 'Erro ao restaurar: ' + (error?.message ?? '') }, { status: 500 });
  }
}
