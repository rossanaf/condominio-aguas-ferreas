'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FadeIn } from '@/components/ui/animate';
import { BarChart3, Info } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

function formatCurrency(val: number | null | undefined): string {
  return (val ?? 0)?.toLocaleString?.('pt-PT', { style: 'currency', currency: 'EUR' }) ?? '0,00 €';
}

const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function RelatoriosClient() {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [cotas, setCotas] = useState<any[]>([]);
  const [outrasDividas, setOutrasDividas] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/pagamentos?ano=${ano}`).then(r => r?.json?.()),
      fetch(`/api/cotas?ano=${ano}`).then(r => r?.json?.()),
      fetch(`/api/outras-dividas`).then(r => r?.json?.()).catch(() => []),
      fetch(`/api/despesas?ano=${ano}`).then(r => r?.json?.()),
    ])
      .then(([p, c, od, d]: any) => {
        setPagamentos(Array.isArray(p) ? p : []);
        setCotas(Array.isArray(c) ? c : []);
        setOutrasDividas(Array.isArray(od) ? od : []);
        setDespesas(Array.isArray(d) ? d : []);
      })
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  }, [ano]);

  // Monthly chart — usa a data de pagamento real (aceita pagamentos de 2026 para dívidas de 2025)
  const monthlyData = mesesNomes.map((nome: string, idx: number) => {
    const mes = idx;
    const receitasMes = (pagamentos ?? [])
      .filter((p: any) => {
        if (!p?.dataPagamento) return false;
        const dt = new Date(p.dataPagamento);
        return dt?.getMonth?.() === mes;
      })
      .reduce((acc: number, p: any) => acc + Number(p?.valor ?? 0), 0);
    const despesasMes = (despesas ?? []).filter((d: any) => {
      const m = new Date(d?.dataEmissao ?? '')?.getMonth?.();
      return m === idx;
    }).reduce((acc: number, d: any) => acc + Number(d?.valor ?? 0), 0);
    return { name: nome, Receitas: Number(receitasMes?.toFixed?.(2) ?? 0), Despesas: Number(despesasMes?.toFixed?.(2) ?? 0) };
  });

  // Per-fração chart: Pago = tudo efectivamente pago no ano (cotas + dívidas transitadas + extra).
  // Pendente = cotas do ano por pagar + dívidas transitadas (COTAS e OBRAS) + cotas extra por pagar.
  const fracaoAgg: Record<string, { pago: number; pendente: number }> = {};

  // Soma de pagos por fração (inclui tudo o que foi pago no ano, mesmo que seja dívida transitada de anos anteriores)
  for (const p of (pagamentos ?? [])) {
    const letra = p?.fracao?.letra ?? 'N/A';
    if (!fracaoAgg[letra]) fracaoAgg[letra] = { pago: 0, pendente: 0 };
    fracaoAgg[letra].pago += Number(p?.valor ?? 0);
  }

  // Pendente: cotas (regulares + dividas transitadas COTAS sintéticas devolvidas por /api/cotas) não-PAGO
  for (const c of (cotas ?? [])) {
    if (c?.status === 'PAGO') continue;
    const letra = c?.fracao?.letra ?? 'N/A';
    if (!fracaoAgg[letra]) fracaoAgg[letra] = { pago: 0, pendente: 0 };
    fracaoAgg[letra].pendente += Number(c?.valorTotal ?? 0);
  }

  // Pendente: dívidas transitadas OBRAS (outros) não liquidadas
  for (const od of (outrasDividas ?? [])) {
    if (od?.liquidada) continue;
    const letra = od?.fracao?.letra ?? 'N/A';
    if (!fracaoAgg[letra]) fracaoAgg[letra] = { pago: 0, pendente: 0 };
    fracaoAgg[letra].pendente += Number(od?.valor ?? 0);
  }

  const fracaoData = Object.entries(fracaoAgg)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letra, vals]: any) => ({
      name: `Fr. ${letra}`,
      Pago: Number((vals?.pago ?? 0)?.toFixed?.(2) ?? 0),
      Pendente: Number((vals?.pendente ?? 0)?.toFixed?.(2) ?? 0),
    }));

  const totalReceitas = (pagamentos ?? []).reduce((acc: number, p: any) => acc + Number(p?.valor ?? 0), 0);
  const totalDespesas = (despesas ?? []).reduce((acc: number, d: any) => acc + Number(d?.valor ?? 0), 0);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-tight font-bold">Relatórios</h1>
            <p className="text-muted-foreground text-sm mt-1">Análise financeira do condomínio</p>
          </div>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
          </Select>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card className="border-blue-200/60 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-900/40" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-3 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-900/80 dark:text-blue-200/90 leading-relaxed">
              Os valores de <strong>Receitas</strong> e <strong>Pago</strong> incluem <strong>tudo o que foi efetivamente pago em {ano}</strong>,
              mesmo quando se referem a cotas ou dívidas transitadas de anos anteriores (usamos a data de pagamento).
            </p>
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Receitas</p>
            <p className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(totalReceitas)}</p>
          </CardContent>
        </Card>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Despesas</p>
            <p className="text-lg font-bold font-mono text-red-500">{formatCurrency(totalDespesas)}</p>
          </CardContent>
        </Card>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={`text-lg font-bold font-mono ${(totalReceitas - totalDespesas) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatCurrency(totalReceitas - totalDespesas)}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse bg-muted rounded-lg" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FadeIn delay={0.2}>
            <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Receitas vs Despesas Mensais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ bottom: 20, left: 10 }}>
                      <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} />
                      <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => formatCurrency(Number(v ?? 0))} />
                      <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Receitas" fill="#80D8C3" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Despesas" fill="#FF9898" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.3}>
            <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Cotas por Fração
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fracaoData} margin={{ bottom: 20, left: 10 }}>
                      <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} />
                      <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => formatCurrency(Number(v ?? 0))} />
                      <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Pago" stackId="a" fill="#80D8C3" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Pendente" stackId="a" fill="#FF9149" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      )}
    </div>
  );
}
