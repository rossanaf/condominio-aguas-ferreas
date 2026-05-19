'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FadeIn } from '@/components/ui/animate';
import { Filter, X } from 'lucide-react';

const mesesNomes = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatCurrency(val: number | null | undefined): string {
  return (val ?? 0)?.toLocaleString?.('pt-PT', { style: 'currency', currency: 'EUR' }) ?? '0,00 €';
}

function statusBadge(status: string) {
  switch (status) {
    case 'PAGO': return <Badge className="bg-emerald-100 text-emerald-700 border-0">Pago</Badge>;
    case 'ATRASADO': return <Badge className="bg-red-100 text-red-700 border-0">Atrasado</Badge>;
    default: return <Badge className="bg-amber-100 text-amber-700 border-0">Pendente</Badge>;
  }
}

export function CotasClient() {
  const { data: session } = useSession() || {};
  const [cotas, setCotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [fracoes, setFracoes] = useState<any[]>([]);
  const [selectedFracao, setSelectedFracao] = useState('all');
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/fracoes').then(r => r?.json?.()).then(d => setFracoes(d ?? [])).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ ano });
    if (isAdmin && selectedFracao !== 'all') params.set('fracaoId', selectedFracao);
    fetch(`/api/cotas?${params.toString()}`)
      .then(r => r?.json?.())
      .then(d => setCotas(d ?? []))
      .catch((err: any) => console.error('Cotas fetch error:', err))
      .finally(() => setLoading(false));
  }, [ano, selectedFracao, isAdmin]);

  const totalAnual = (cotas ?? []).reduce((acc: number, c: any) => acc + (c?.valorTotal ?? 0), 0);
  const totalPago = (cotas ?? []).filter((c: any) => c?.status === 'PAGO').reduce((acc: number, c: any) => acc + (c?.valorTotal ?? 0), 0);
  const totalPendente = totalAnual - totalPago;

  const hasActiveFilter = isAdmin && selectedFracao !== 'all';

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-tight font-bold">Cotas</h1>
            <p className="text-muted-foreground text-sm mt-1">Mapa de cotas anuais por fração</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total {hasActiveFilter ? 'Filtrado' : 'Anual'}</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(totalAnual)}</p>
          </CardContent>
        </Card>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(totalPago)}</p>
          </CardContent>
        </Card>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pendente</p>
            <p className="text-lg font-bold font-mono text-amber-500">{formatCurrency(totalPendente)}</p>
          </CardContent>
        </Card>
      </div>

      <FadeIn delay={0.2}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-0">
            {isAdmin && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
                  <Filter className="h-4 w-4" />
                  Filtro:
                </div>
                <Select value={selectedFracao} onValueChange={setSelectedFracao}>
                  <SelectTrigger className="w-full sm:w-[260px]">
                    <SelectValue placeholder="Fração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as frações</SelectItem>
                    {(fracoes ?? []).map((f: any) => (
                      <SelectItem key={f?.id ?? ''} value={f?.id ?? ''}>
                        Fração {f?.letra ?? '?'}{f?.proprietario ? ` — ${f.proprietario}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActiveFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFracao('all')} className="shrink-0">
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fração</TableHead>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Orçamento</TableHead>
                    <TableHead className="text-right">Fundo Reserva</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
                  ) : (cotas?.length ?? 0) === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilter ? 'Sem cotas para a fração selecionada' : 'Sem cotas para este período'}
                    </TableCell></TableRow>
                  ) : (
                    (cotas ?? []).map((c: any) => (
                      <TableRow key={c?.id ?? Math.random()} className={c?.isDividaTransitada ? 'bg-red-50/40' : ''}>
                        <TableCell className="font-medium">Fração {c?.fracao?.letra ?? '?'}</TableCell>
                        <TableCell>
                          {c?.isDividaTransitada ? (
                            <span className="inline-flex items-center gap-2">
                              <Badge className="bg-red-100 text-red-700 border-0">Transitada</Badge>
                              <span className="text-xs text-muted-foreground">{c?.descricao ?? 'Cotas em atraso'}</span>
                            </span>
                          ) : (
                            mesesNomes[c?.mes ?? 0] ?? ''
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {c?.isDividaTransitada ? '—' : formatCurrency(c?.valorOrcamento)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {c?.isDividaTransitada ? '—' : formatCurrency(c?.valorFundoReserva)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(c?.valorTotal)}</TableCell>
                        <TableCell className="text-center">{statusBadge(c?.status ?? 'PENDENTE')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
