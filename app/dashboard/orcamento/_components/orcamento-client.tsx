'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { PieChart, Euro, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

function formatCurrency(val: number | null | undefined): string {
  return (val ?? 0)?.toLocaleString?.('pt-PT', { style: 'currency', currency: 'EUR' }) ?? '0,00 €';
}

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#80D8C3', '#A19AD3', '#FF6363'];

export function OrcamentoClient() {
  const [orcamento, setOrcamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    setLoading(true);
    fetch(`/api/orcamento?ano=${ano}`)
      .then(r => r?.json?.())
      .then(d => setOrcamento(d ?? null))
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  }, [ano]);

  const chartData = orcamento ? [
    { name: 'EDP', value: orcamento?.valorEDP ?? 0 },
    { name: 'Limpeza', value: orcamento?.valorLimpeza ?? 0 },
    { name: 'Jardinagem', value: orcamento?.valorJardinagem ?? 0 },
    { name: 'Assist. Técnica', value: orcamento?.valorAssistencia ?? 0 },
    { name: 'Administrativas', value: orcamento?.valorAdministrativas ?? 0 },
    { name: 'Bancárias', value: orcamento?.valorBancarias ?? 0 },
  ].filter((d: any) => (d?.value ?? 0) > 0) : [];

  if (loading) return <div className="space-y-4"><div className="h-64 animate-pulse bg-muted rounded-lg" /></div>;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-tight font-bold">Orçamento</h1>
            <p className="text-muted-foreground text-sm mt-1">Controlo do orçamento anual do condomínio</p>
          </div>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
          </Select>
        </div>
      </FadeIn>

      {!orcamento ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Sem orçamento definido para {ano}</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SlideIn from="bottom">
              <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Euro className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Subtotal</p>
                      <p className="text-lg font-bold font-mono">{formatCurrency(orcamento?.subtotal)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
            <SlideIn from="bottom" delay={0.1}>
              <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fundo de Reserva (10%)</p>
                      <p className="text-lg font-bold font-mono">{formatCurrency(orcamento?.fundoReserva)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
            <SlideIn from="bottom" delay={0.2}>
              <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <PieChart className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Orçamento</p>
                      <p className="text-lg font-bold font-mono">{formatCurrency(orcamento?.total)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FadeIn delay={0.3}>
              <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Distribuição de Despesas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RPieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {(chartData ?? []).map((_: any, index: number) => (
                            <Cell key={index} fill={COLORS[index % COLORS?.length ?? 1]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value ?? 0))} contentStyle={{ fontSize: 11 }} />
                        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                      </RPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={0.4}>
              <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Detalhe do Orçamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'EDP', value: orcamento?.valorEDP },
                      { label: 'Limpeza', value: orcamento?.valorLimpeza },
                      { label: 'Jardinagem', value: orcamento?.valorJardinagem },
                      { label: 'Assistência Técnica', value: orcamento?.valorAssistencia },
                      { label: 'Despesas Administrativas', value: orcamento?.valorAdministrativas },
                      { label: 'Despesas Bancárias', value: orcamento?.valorBancarias },
                    ].map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS?.length ?? 1] }} />
                          <span className="text-sm">{item?.label ?? ''}</span>
                        </div>
                        <span className="font-mono text-sm font-semibold">{formatCurrency(item?.value)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t-2 border-border">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold">Subtotal</span>
                        <span className="font-mono text-sm font-bold">{formatCurrency(orcamento?.subtotal)}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm text-muted-foreground">+ Fundo Reserva (10%)</span>
                        <span className="font-mono text-sm">{formatCurrency(orcamento?.fundoReserva)}</span>
                      </div>
                      <div className="flex justify-between mt-2 pt-2 border-t">
                        <span className="text-base font-bold">Total</span>
                        <span className="font-mono text-base font-bold text-primary">{formatCurrency(orcamento?.total)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </>
      )}
    </div>
  );
}
