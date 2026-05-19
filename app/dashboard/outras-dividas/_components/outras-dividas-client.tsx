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
import { FileWarning, AlertCircle, CheckCircle, Receipt, Loader2, Eye, Download, Filter, X } from 'lucide-react';
import { toast } from 'sonner';

function formatCurrency(val: number | null | undefined): string {
  return (val ?? 0)?.toLocaleString?.('pt-PT', { style: 'currency', currency: 'EUR' }) ?? '0,00 €';
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('pt-PT');
  } catch {
    return '-';
  }
}

export function OutrasDividasClient() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [dividas, setDividas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState<string | null>(null);

  // Admin-only filters
  const [fracaoFilter, setFracaoFilter] = useState<string>('all');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/outras-dividas')
      .then((r) => (r?.ok ? r.json() : []))
      .then((data: any) => {
        setDividas(Array.isArray(data) ? data : []);
      })
      .catch((err: any) => {
        console.error('Fetch outras dividas error:', err);
        setDividas([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate receipt PDF (view or download)
  const generateReceiptPdf = async (pagamentoId: string, mode: 'view' | 'download') => {
    if (!pagamentoId) return;
    if (mode === 'download') setDownloadingReceipt(pagamentoId);
    else setViewingReceipt(pagamentoId);
    try {
      const res = await fetch('/api/recibos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagamentoId }),
      });
      if (!res?.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData?.error ?? 'Erro ao gerar recibo');
        return;
      }
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/pdf')) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData?.error ?? 'Erro ao gerar recibo');
        return;
      }
      const blob = await res.blob();
      const url = window?.URL?.createObjectURL?.(blob);
      if (!url) return;
      if (mode === 'download') {
        const a = document.createElement('a');
        a.href = url;
        a.download = `recibo_${pagamentoId?.slice?.(-6) ?? ''}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Recibo descarregado');
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar recibo');
    } finally {
      setDownloadingReceipt(null);
      setViewingReceipt(null);
    }
  };

  // Unique fractions present in the debts list (for admin filter)
  const fracoesList = Array.from(
    new Map(
      (dividas ?? [])
        .map((d: any) => d?.fracao)
        .filter((f: any) => !!f)
        .map((f: any) => [f?.id, f])
    ).values()
  );

  const dividasFiltered = (dividas ?? []).filter((d: any) => {
    if (isAdmin && fracaoFilter !== 'all' && d?.fracaoId !== fracaoFilter) return false;
    if (estadoFilter === 'pendentes' && d?.liquidada) return false;
    if (estadoFilter === 'liquidadas' && !d?.liquidada) return false;
    return true;
  });

  const hasActiveFilter = (isAdmin && fracaoFilter !== 'all') || estadoFilter !== 'all';

  const totalPendente = (dividas ?? [])
    .filter((d: any) => !d?.liquidada)
    .reduce((acc: number, d: any) => acc + (Number(d?.valor) || 0), 0);
  const totalLiquidado = (dividas ?? [])
    .filter((d: any) => d?.liquidada)
    .reduce((acc: number, d: any) => acc + (Number(d?.valor) || 0), 0);
  const countPendente = (dividas ?? []).filter((d: any) => !d?.liquidada).length;
  const countLiquidado = (dividas ?? []).filter((d: any) => d?.liquidada).length;

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

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl tracking-tight font-bold flex items-center gap-2">
            <FileWarning className="h-6 w-6 text-amber-500" />
            Outras Dívidas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin
              ? 'Dívidas transitadas (tipo "Outros") de todas as frações'
              : 'Dívidas transitadas (tipo "Outros") da sua fração, herdadas da gestão anterior'}
          </p>
        </div>
      </FadeIn>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SlideIn from="bottom" delay={0}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Pendente</p>
                  <p className="text-xl font-bold mt-1 font-mono text-red-500">
                    {formatCurrency(totalPendente)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {countPendente} dívida{countPendente === 1 ? '' : 's'}
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
                  <p className="text-xs text-muted-foreground font-medium">Total Liquidado</p>
                  <p className="text-xl font-bold mt-1 font-mono text-emerald-600">
                    {formatCurrency(totalLiquidado)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {countLiquidado} dívida{countLiquidado === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideIn>
      </div>

      {/* Debts table */}
      <FadeIn delay={0.2}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-amber-500" />
              {isAdmin ? 'Dívidas "Outros" — Todas as frações' : 'Minhas Dívidas "Outros"'}
            </CardTitle>
            <CardDescription>
              Para dívidas liquidadas, pode consultar o recibo associado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(dividas ?? []).length > 0 && (
              <div className="mb-4 p-3 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filtros</span>
                  {hasActiveFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 px-2 text-xs"
                      onClick={() => {
                        setFracaoFilter('all');
                        setEstadoFilter('all');
                      }}
                    >
                      <X className="h-3 w-3 mr-1" /> Limpar
                    </Button>
                  )}
                </div>
                <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2' : ''} gap-3`}>
                  {isAdmin && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Fração</Label>
                      <Select value={fracaoFilter} onValueChange={setFracaoFilter}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as frações</SelectItem>
                          {(fracoesList ?? []).map((f: any) => (
                            <SelectItem key={f?.id ?? ''} value={f?.id ?? ''}>
                              Fração {f?.letra ?? '?'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estado</Label>
                    <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os estados</SelectItem>
                        <SelectItem value="pendentes">Pendentes</SelectItem>
                        <SelectItem value="liquidadas">Liquidadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {(dividas ?? []).length === 0 ? (
              <div className="text-center py-10">
                <FileWarning className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {isAdmin
                    ? 'Não existem dívidas do tipo "Outros" registadas'
                    : 'Não tem outras dívidas registadas'}
                </p>
              </div>
            ) : (dividasFiltered ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma dívida corresponde aos filtros selecionados
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && <TableHead>Fração</TableHead>}
                      <TableHead>Descrição</TableHead>
                      <TableHead>Ano Ref.</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Recibo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dividasFiltered ?? []).map((d: any) => (
                      <TableRow key={d?.id ?? ''} className={d?.liquidada ? 'opacity-70' : ''}>
                        {isAdmin && (
                          <TableCell className="font-medium">Fração {d?.fracao?.letra ?? '?'}</TableCell>
                        )}
                        <TableCell>{d?.descricao ?? '-'}</TableCell>
                        <TableCell>{d?.anoReferencia ?? '-'}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(d?.valor)}</TableCell>
                        <TableCell>
                          {d?.liquidada ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                              Liquidada
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {d?.liquidada && d?.pagamento?.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
                                {d?.pagamento?.numeroRecibo ?? ''}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Ver recibo"
                                disabled={viewingReceipt === d.pagamento.id}
                                onClick={() => generateReceiptPdf(d.pagamento.id, 'view')}
                              >
                                {viewingReceipt === d.pagamento.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Descarregar recibo"
                                disabled={downloadingReceipt === d.pagamento.id}
                                onClick={() => generateReceiptPdf(d.pagamento.id, 'download')}
                              >
                                {downloadingReceipt === d.pagamento.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          ) : d?.liquidada ? (
                            <span className="text-xs text-muted-foreground">Sem recibo</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
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
