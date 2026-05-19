export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    const dividas = await prisma.dividaTransitada.findMany({
      include: { fracao: true },
      orderBy: [{ liquidada: 'asc' }, { anoReferencia: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json((dividas ?? []).map((d: any) => ({
      ...d,
      valor: Number(d?.valor ?? 0),
      dataLiquidacao: d?.dataLiquidacao?.toISOString?.() ?? null,
      createdAt: d?.createdAt?.toISOString?.() ?? '',
    })));
  } catch (error: any) {
    console.error('Dívidas transitadas error:', error);
    return NextResponse.json({ error: 'Erro ao carregar dívidas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    const body = await request.json();
    const { fracaoId, tipo, descricao, valor, anoReferencia, observacoes } = body ?? {};

    if (!fracaoId || !descricao || !valor || !anoReferencia) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 });
    }

    const divida = await prisma.dividaTransitada.create({
      data: {
        fracaoId,
        tipo: tipo === 'OBRAS' ? 'OBRAS' : 'COTAS',
        descricao,
        valor: parseFloat(valor),
        anoReferencia: parseInt(anoReferencia),
        observacoes: observacoes || null,
      },
      include: { fracao: true },
    });

    return NextResponse.json({
      ...divida,
      valor: Number(divida.valor ?? 0),
    }, { status: 201 });
  } catch (error: any) {
    console.error('Dívida transitada create error:', error);
    return NextResponse.json({ error: 'Erro ao criar dívida' }, { status: 500 });
  }
}

async function getNextReciboNumber(ano: number): Promise<string> {
  const count = await prisma.pagamento.count({
    where: { numeroRecibo: { startsWith: `CAF-RCB-${ano}-` } },
  });
  const seq = String(count + 1).padStart(2, '0');
  return `CAF-RCB-${ano}-${seq}`;
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    const body = await request.json();
    const { id, liquidada, dataLiquidacao, dataPagamento, metodoPagamento, referencia, observacoes } = body ?? {};

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    // Load current state + existing payments (if any)
    const existing = await prisma.dividaTransitada.findUnique({
      where: { id },
      include: { fracao: true, pagamentos: true },
    });
    if (!existing) return NextResponse.json({ error: 'Dívida não encontrada' }, { status: 404 });

    if (liquidada) {
      // LIQUIDAR: require payment details and create a Pagamento
      if (!dataPagamento) {
        return NextResponse.json({ error: 'Data de pagamento obrigatória ao liquidar' }, { status: 400 });
      }
      // Prevent double-liquidation
      if (existing.liquidada && (existing.pagamentos ?? []).length > 0) {
        return NextResponse.json({ error: 'Dívida já está liquidada' }, { status: 400 });
      }

      const pagDate = new Date(dataPagamento);
      const anoPag = pagDate.getFullYear();
      const numeroRecibo = await getNextReciboNumber(anoPag);
      const valorNum = Number(existing.valor ?? 0);
      const tipoObs = existing.tipo === 'OBRAS' ? 'Outros' : 'Cotas em atraso';
      const autoObs = `Liquidação de dívida transitada (${tipoObs}) — ${existing.descricao} [${existing.anoReferencia}]`;

      const result = await prisma.$transaction(async (tx) => {
        const pagamento = await tx.pagamento.create({
          data: {
            fracaoId: existing.fracaoId,
            dividaTransitadaId: existing.id,
            valor: valorNum,
            dataPagamento: pagDate,
            metodoPagamento: metodoPagamento || 'Transferência',
            referencia: referencia || null,
            observacoes: observacoes ? `${autoObs} — ${observacoes}` : autoObs,
            numeroRecibo,
          },
        });

        const divida = await tx.dividaTransitada.update({
          where: { id },
          data: {
            liquidada: true,
            dataLiquidacao: dataLiquidacao ? new Date(dataLiquidacao) : pagDate,
          },
          include: { fracao: true },
        });

        return { divida, pagamento };
      });

      return NextResponse.json({
        ...result.divida,
        valor: Number(result.divida.valor ?? 0),
        dataLiquidacao: result.divida?.dataLiquidacao?.toISOString?.() ?? null,
        pagamentoCriado: {
          id: result.pagamento.id,
          numeroRecibo: result.pagamento.numeroRecibo,
        },
      });
    }

    // REABRIR: delete associated payment(s) and mark as not liquidada
    const result = await prisma.$transaction(async (tx) => {
      if ((existing.pagamentos ?? []).length > 0) {
        await tx.pagamento.deleteMany({ where: { dividaTransitadaId: id } });
      }
      const divida = await tx.dividaTransitada.update({
        where: { id },
        data: { liquidada: false, dataLiquidacao: null },
        include: { fracao: true },
      });
      return divida;
    });

    return NextResponse.json({
      ...result,
      valor: Number(result.valor ?? 0),
      dataLiquidacao: null,
    });
  } catch (error: any) {
    console.error('Dívida transitada update error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dívida: ' + (error?.message ?? '') }, { status: 500 });
  }
}

/**
 * PATCH /api/dividas-transitadas
 * Edit the descriptive fields of an inherited debt.
 * Only allowed when the debt is NOT liquidated (to keep data consistent with any linked payment/receipt).
 * Body: { id, fracaoId?, tipo?, descricao?, valor?, anoReferencia?, observacoes? }
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    const body = await request.json();
    const { id, fracaoId, tipo, descricao, valor, anoReferencia, observacoes } = body ?? {};
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const existing = await prisma.dividaTransitada.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Dívida não encontrada' }, { status: 404 });

    if (existing.liquidada) {
      return NextResponse.json({
        error: 'Dívida já liquidada. Reabra primeiro a dívida (o pagamento/recibo será anulado) antes de a editar.',
      }, { status: 400 });
    }

    const updateData: any = {};
    if (fracaoId !== undefined && fracaoId !== null && fracaoId !== '') updateData.fracaoId = fracaoId;
    if (tipo !== undefined) updateData.tipo = tipo === 'OBRAS' ? 'OBRAS' : 'COTAS';
    if (descricao !== undefined) updateData.descricao = descricao;
    if (valor !== undefined && valor !== null && valor !== '') {
      const valorNum = parseFloat(String(valor));
      if (Number.isNaN(valorNum) || valorNum < 0) {
        return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
      }
      updateData.valor = valorNum;
    }
    if (anoReferencia !== undefined && anoReferencia !== null && anoReferencia !== '') {
      const anoNum = parseInt(String(anoReferencia), 10);
      if (Number.isNaN(anoNum)) {
        return NextResponse.json({ error: 'Ano de referência inválido' }, { status: 400 });
      }
      updateData.anoReferencia = anoNum;
    }
    if (observacoes !== undefined) updateData.observacoes = observacoes || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Sem campos para atualizar' }, { status: 400 });
    }

    const updated = await prisma.dividaTransitada.update({
      where: { id },
      data: updateData,
      include: { fracao: true },
    });

    return NextResponse.json({
      ...updated,
      valor: Number(updated.valor ?? 0),
      dataLiquidacao: updated?.dataLiquidacao?.toISOString?.() ?? null,
      createdAt: updated?.createdAt?.toISOString?.() ?? '',
    });
  } catch (error: any) {
    console.error('Dívida transitada PATCH error:', error);
    return NextResponse.json({ error: 'Erro ao editar dívida: ' + (error?.message ?? '') }, { status: 500 });
  }
}

/**
 * DELETE /api/dividas-transitadas?id=<id>
 * Remove an inherited debt. Only allowed when it is NOT liquidated (to avoid orphaning payments/receipts).
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const user = session?.user as any;
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const existing = await prisma.dividaTransitada.findUnique({
      where: { id },
      include: { pagamentos: { select: { id: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Dívida não encontrada' }, { status: 404 });

    if (existing.liquidada || (existing.pagamentos ?? []).length > 0) {
      return NextResponse.json({
        error: 'Dívida já liquidada. Reabra primeiro a dívida (o pagamento/recibo será anulado) antes de a eliminar.',
      }, { status: 400 });
    }

    await prisma.dividaTransitada.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Dívida transitada DELETE error:', error);
    return NextResponse.json({ error: 'Erro ao eliminar dívida: ' + (error?.message ?? '') }, { status: 500 });
  }
}
