'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { AlertTriangle, AlertCircle, Calendar, Filter, X } from 'lucide-react';

const mesesNomes = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatCurrency(val: number | null | undefined): string {
  return (val ?? 0)?.toLocaleString?.('pt-PT', { style: 'currency', currency: 'EUR' }) ?? '0,00 €';
}

interface CotaAtrasada {
  id: string;
  fracaoId: string;
  fracao: { id: string; letra: string; proprietario?: string | null } | null;
  ano: number;
  mes: number;
  valorTotal: number;
  status: string;
}

interface DividaAtrasada {
  id: string;
  fracaoId: string;
  fracao: { id: string; letra: string; proprietario?: string | null } | null;
  descricao: string;
  valor: number;
  anoReferencia: number | null;
  liquidada: boolean;
}

export function CotasAtrasadasClient() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [cotas, setCotas] = useState<CotaAtrasada[]>([]);
  const [dividas, setDividas] = useState<DividaAtrasada[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [anoCorrente, setAnoCorrente] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  // Admin-only filters
  const [fracaoFilter, setFracaoFilter] = useState<string>('all');

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/cotas-atrasadas')
      .then((r) => (r?.ok ? r.json() : null))
      .then((data: any) => {
        if (!data) return;
        setCotas(Array.isArray(data?.cotas) ? data.cotas : []);
        setDividas(Array.isArray(data?.dividas) ? data.dividas : []);
        setTotal(Number(data?.total ?? 0));
        setAnoCorrente(Number(data?.anoCorrente ?? new Date().getFullYear()));
      })
      .catch((err: any) => {
        console.error('Fetch cotas atrasadas error:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unique fractions (for admin filter)
  const fracoesList = Array.from(
    new Map(
      [...(cotas ?? []), ...(dividas ?? [])]
        .map((item: any) => item?.fracao)
        .filter((f: any) => !!f)
        .map((f: any) => [f?.id, f])
    ).values()
  );

  const cotasFiltered = (cotas ?? []).filter((c: CotaAtrasada) => {
    if (isAdmin && fracaoFilter !== 'all' && c?.fracaoId !== fracaoFilter) return false;
    return true;
  });

  const dividasFiltered = (dividas ?? []).filter((d: DividaAtrasada) => {
    if (isAdmin && fracaoFilter !== 'all' && d?.fracaoId !== fracaoFilter) return false;
    return true;
  });

  const hasActiveFilter = isAdmin && fracaoFilter !== 'all';

  const totalFiltered = [...cotasFiltered, ...dividasFiltered].reduce(
    (acc: number, item: any) => acc + (Number(item?.valorTotal ?? item?.valor) || 0),
    0
  );

  // Group cotas by year-fraction pair for nicer display
  const groupedCotas = cotasFiltered.reduce((acc: Record<string, CotaAtrasada[]>, c: CotaAtrasada) => {
    const key = `${c?.fracaoId ?? ''}-${c?.ano ?? ''}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i: number) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const nothingPending = (cotasFiltered?.length ?? 0) === 0 && (dividasFiltered?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl tracking-tight font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            Cotas em Atraso
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin
              ? `Cotas e dívidas por liquidar de anos anteriores a ${anoCorrente}`
              : `Tem cotas por pagar de anos anteriores a ${anoCorrente}. Por favor regularize a sua situação.`}
          </p>
        </div>
      </FadeIn>

      {/* Warning banner — only if there are pending items and user is condomino */}
      {!isAdmin && !nothingPending && (
        <SlideIn from="top">
          <div
            className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-800 text-sm">
                Atenção: cotas em atraso de anos anteriores
              </p>
              <p className="text-red-700 text-xs mt-1">
                Tem um total em dívida de <strong>{formatCurrency(total)}</strong> referente
                a cotas e dívidas de anos anteriores a {anoCorrente}. Contacte a administração
                para regularizar o pagamento o mais breve possível.
              </p>
            </div>
          </div>
        </SlideIn>
      )}

      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SlideIn from="bottom" delay={0}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Total {hasActiveFilter ? 'Filtrado' : 'em Dívida'}
                  </p>
                  <p className="text-xl font-bold mt-1 font-mono text-red-500">
                    {formatCurrency(hasActiveFilter ? totalFiltered : total)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(cotasFiltered?.length ?? 0) + (dividasFiltered?.length ?? 0)} registo(s)
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideIn>
        <SlideIn from="bottom" delay={0.1}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Ano Corrente</p>
                  <p className="text-xl font-bold mt-1 font-mono">{anoCorrente}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A mostrar apenas dívidas de anos anteriores
                  </p>
                </div>
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideIn>
      </div>

      {/* Debts + Cotas table */}
      <FadeIn delay={0.2}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              {isAdmin ? 'Cotas e dívidas em atraso — Todas as frações' : 'As minhas cotas em atraso'}
            </CardTitle>
            <CardDescription>
              Inclui cotas regulares e dívidas transitadas do tipo “Cotas” por liquidar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin && ((cotas?.length ?? 0) > 0 || (dividas?.length ?? 0) > 0) && (
              <div className="mb-4 p-3 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filtros</span>
                  {hasActiveFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 px-2 text-xs"
                      onClick={() => setFracaoFilter('all')}
                    >
                      <X className="h-3 w-3 mr-1" /> Limpar
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fração</Label>
                  <Select value={fracaoFilter} onValueChange={setFracaoFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as frações</SelectItem>
                      {(fracoesList ?? []).map((f: any) => (
                        <SelectItem key={f?.id ?? ''} value={f?.id ?? ''}>
                          Fração {f?.letra ?? '?'}{f?.proprietario ? ` — ${f.proprietario}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {nothingPending ? (
              <div className="text-center py-10">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilter
                    ? 'Nenhuma cota em atraso para a fração selecionada'
                    : isAdmin
                    ? 'Não existem cotas em atraso de anos anteriores'
                    : 'Não tem cotas em atraso de anos anteriores'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && <TableHead>Fração</TableHead>}
                      <TableHead>Ano</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Dívidas transitadas tipo COTAS */}
                    {(dividasFiltered ?? []).map((d: DividaAtrasada) => (
                      <TableRow key={`div-${d?.id ?? ''}`} className="bg-red-50/40">
                        {isAdmin && (
                          <TableCell className="font-medium">Fração {d?.fracao?.letra ?? '?'}</TableCell>
                        )}
                        <TableCell>{d?.anoReferencia ?? '-'}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2">
                            <Badge className="bg-red-100 text-red-700 border-0 text-xs">Transitada</Badge>
                            <span className="text-xs">{d?.descricao ?? 'Cotas em atraso'}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(d?.valor)}</TableCell>
                        <TableCell>
                          <Badge className="bg-red-100 text-red-700 border-0 text-xs">Por liquidar</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Cotas regulares não pagas */}
                    {(cotasFiltered ?? []).map((c: CotaAtrasada) => (
                      <TableRow key={`cota-${c?.id ?? ''}`}>
                        {isAdmin && (
                          <TableCell className="font-medium">Fração {c?.fracao?.letra ?? '?'}</TableCell>
                        )}
                        <TableCell>{c?.ano ?? '-'}</TableCell>
                        <TableCell>{mesesNomes[c?.mes ?? 0] ?? '-'}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(c?.valorTotal)}</TableCell>
                        <TableCell>
                          {c?.status === 'ATRASADO' ? (
                            <Badge className="bg-red-100 text-red-700 border-0 text-xs">Atrasado</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Pendente</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
