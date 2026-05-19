'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle,
  CheckCircle, Clock, Receipt, CreditCard, Landmark, ShieldAlert, FileWarning, ArrowRight, Copy, Building, Download, Upload, Loader2, AlertCircle
} from 'lucide-react';

const meses = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatCurrency(val: number | null | undefined): string {
  return (val ?? 0)?.toLocaleString?.('pt-PT', { style: 'currency', currency: 'EUR' }) ?? '0,00 €';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try { return new Date(dateStr)?.toLocaleDateString?.('pt-PT') ?? '-'; } catch { return '-'; }
}

export function DashboardClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r?.json?.())
      .then(d => setData(d ?? null))
      .catch((err: any) => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i: number) => (
            <Card key={i}><CardContent className="p-6"><div className="h-20 animate-pulse bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const isAdmin = data?.isAdmin ?? false;

  const statCards = isAdmin ? [
    { label: 'Total Receitas', value: formatCurrency(data?.totalReceitas), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Despesas', value: formatCurrency(data?.totalDespesas), icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Saldo Conta Corrente', value: formatCurrency(data?.saldoContaCorrente), icon: Wallet, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Saldo Fundo Reserva', value: formatCurrency(data?.saldoFundoReserva), icon: Landmark, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  ] : (() => {
    const totalPendenteFracao = (data?.cotasPendentesValor ?? 0) + (data?.outrasDividasPendentesValor ?? 0);
    return [
      { label: 'Conta Corrente Fração', value: formatCurrency(totalPendenteFracao), icon: Wallet, color: totalPendenteFracao > 0 ? 'text-red-500' : 'text-emerald-600', bg: totalPendenteFracao > 0 ? 'bg-red-50' : 'bg-emerald-50', isHero: true },
      { label: 'Total Pago', value: formatCurrency((data?.cotasPagasValor ?? 0) + (data?.outrasDividasPagasValor ?? 0)), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Cotas Pagas', value: formatCurrency(data?.cotasPagasValor), icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Outras Dívidas Pagas', value: formatCurrency(data?.outrasDividasPagasValor), icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Total Pendente', value: formatCurrency((data?.cotasPendentesValor ?? 0) + (data?.outrasDividasPendentesValor ?? 0)), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
      { label: 'Cotas Pendentes', value: formatCurrency(data?.cotasPendentesValor), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
      { label: 'Outras Dívidas Pendentes', value: formatCurrency(data?.outrasDividasPendentesValor), icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    ];
  })();

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl tracking-tight font-bold">Painel de Controlo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? 'Visão geral do condomínio' : 'Resumo da sua fração'}
          </p>
        </div>
      </FadeIn>

      {/* Alerta dedicado a "Outras Dívidas" pendentes — apenas para admin */}
      {isAdmin && (data?.outrasDividasCount ?? 0) > 0 && (
        <FadeIn delay={0.05}>
          <Card
            className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-900/40"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileWarning className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                      Outras Dívidas Pendentes
                    </p>
                    <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-0.5">
                      {(data?.outrasDividasCount ?? 0) === 1
                        ? '1 dívida em atraso'
                        : `${data?.outrasDividasCount ?? 0} dívidas em atraso`}
                      {' — '}
                      <span className="font-mono font-semibold">{formatCurrency(data?.outrasDividasTotal)}</span>
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="border-amber-300 hover:bg-amber-100/50 dark:border-amber-800 dark:hover:bg-amber-900/30">
                  <Link href="/dashboard/transitados">
                    Ver detalhes <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Card de destaque "Conta Corrente Fração" para condóminos */}
      {!isAdmin && statCards.length > 0 && (() => {
        const hero = statCards[0];
        const HeroIcon = hero?.icon;
        return (
          <SlideIn from="bottom" delay={0}>
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{hero?.label ?? ''}</p>
                    <p className={`text-3xl font-bold mt-1 font-mono ${hero?.color ?? ''}`}>{hero?.value ?? ''}</p>

                  </div>
                  <div className={`w-14 h-14 ${hero?.bg ?? ''} rounded-2xl flex items-center justify-center`}>
                    {HeroIcon && <HeroIcon className={`h-7 w-7 ${hero?.color ?? ''}`} />}
                  </div>
                </div>
              </CardContent>
            </Card>
          </SlideIn>
        );
      })()}

      {/* Card IBAN — apenas para condóminos */}
      {!isAdmin && (
        <FadeIn delay={0.1}>
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-900/40" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">IBAN do Condomínio</p>
                    <p className="font-mono text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-200 tracking-wide mt-0.5">
                      PT50 0035 0901 0000 8388 2001 0
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-300 hover:bg-blue-100/50 dark:border-blue-800 dark:hover:bg-blue-900/30 shrink-0"
                  onClick={() => {
                    navigator?.clipboard?.writeText?.('PT50003509010000838820010')
                      ?.then?.(() => toast.success('IBAN copiado!'))
                      ?.catch?.(() => toast.error('Não foi possível copiar'));
                  }}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        {(isAdmin ? statCards : statCards.filter((c: any) => !c?.isHero)).map((card: any, i: number) => {
          const Icon = card?.icon;
          return (
            <SlideIn key={i} from="bottom" delay={(i + 1) * 0.1}>
              <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{card?.label ?? ''}</p>
                      <p className="text-xl font-bold mt-1 font-mono">{card?.value ?? ''}</p>
                    </div>
                    <div className={`w-10 h-10 ${card?.bg ?? ''} rounded-xl flex items-center justify-center`}>
                      {Icon && <Icon className={`h-5 w-5 ${card?.color ?? ''}`} />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
          );
        })}
      </div>

      {isAdmin && (data?.cotasPagas ?? 0) + (data?.cotasPendentes ?? 0) > 0 && (
        <FadeIn delay={0.3}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Estado das Cotas {new Date().getFullYear()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${((data?.cotasPagas ?? 0) / ((data?.cotasPagas ?? 0) + (data?.cotasPendentes ?? 0))) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-mono text-muted-foreground">
                  {data?.cotasPagas ?? 0}/{(data?.cotasPagas ?? 0) + (data?.cotasPendentes ?? 0)}
                </span>
              </div>
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Pagas ({data?.cotasPagas ?? 0})</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-muted" />
                  <span className="text-muted-foreground">Pendentes ({data?.cotasPendentes ?? 0})</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {isAdmin && (
        <FadeIn delay={0.35}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo Total</p>
                    <p className="font-mono font-semibold text-sm">{formatCurrency((data?.saldoContaCorrente ?? 0) + (data?.saldoFundoReserva ?? 0))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Pendente (Cotas + Dívidas)</p>
                    <p className="font-mono font-semibold text-sm text-amber-600">{formatCurrency(data?.totalPendente)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Receitas → CC</p>
                    <p className="font-mono font-semibold text-sm">{formatCurrency(data?.receitasCC)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-700" />
                  <div>
                    <p className="text-xs text-muted-foreground">Receitas → FR (10%)</p>
                    <p className="font-mono font-semibold text-sm">{formatCurrency(data?.receitasFR)}</p>
                  </div>
                </div>
              </div>
              {(data?.saldoTransitado || data?.dividasPendentesTotal > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
                  {data?.saldoTransitado && (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <Landmark className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Transitado CC</p>
                          <p className="font-mono font-semibold text-sm">{formatCurrency(data?.saldoTransitado?.saldoContaCorrente)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <Landmark className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Transitado FR</p>
                          <p className="font-mono font-semibold text-sm">{formatCurrency(data?.saldoTransitado?.saldoFundoReserva)}</p>
                        </div>
                      </div>
                    </>
                  )}
                  {data?.dividasPendentesTotal > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <ShieldAlert className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Dívidas Pendentes</p>
                        <p className="font-mono font-semibold text-sm text-red-500">{formatCurrency(data?.dividasPendentesTotal)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={0.4}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Pagamentos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.pagamentosRecentes?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sem pagamentos registados</p>
              ) : (
                <div className="space-y-3">
                  {(data?.pagamentosRecentes ?? []).slice(0, 5).map((p: any) => (
                    <div key={p?.id ?? Math.random()} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium">Fração {p?.fracao?.letra ?? '?'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(p?.dataPagamento)}</p>
                      </div>
                      <span className="font-mono text-sm font-semibold text-emerald-600">{formatCurrency(p?.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {isAdmin && (
          <FadeIn delay={0.5}>
            <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Despesas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(data?.despesasRecentes?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem despesas registadas</p>
                ) : (
                  <div className="space-y-3">
                    {(data?.despesasRecentes ?? []).slice(0, 5).map((d: any) => (
                      <div key={d?.id ?? Math.random()} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{d?.descricao ?? ''}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(d?.dataEmissao)}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-sm font-semibold text-red-500">{formatCurrency(d?.valor)}</span>
                          <Badge variant={d?.paga ? 'default' : 'outline'} className="ml-2 text-xs">
                            {d?.paga ? 'Paga' : 'Pendente'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {isAdmin && (
          <FadeIn delay={0.55}>
            <Card className="border-dashed" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                      <Download className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Backup Completo</p>
                      <p className="text-xs text-muted-foreground">Código-fonte + base de dados (ZIP)</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={backupLoading}
                      onClick={async () => {
                        setBackupLoading(true);
                        try {
                          const res = await fetch('/api/backup');
                          if (!res.ok) throw new Error('Erro ao gerar backup');
                          const blob = await res.blob();
                          const disposition = res.headers.get('Content-Disposition') ?? '';
                          const match = disposition.match(/filename="?([^"]+)"?/);
                          const filename = match?.[1] ?? 'backup_condominio.zip';
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          toast.success('Backup descarregado com sucesso');
                        } catch {
                          toast.error('Erro ao descarregar backup');
                        } finally {
                          setBackupLoading(false);
                        }
                      }}
                    >
                      {backupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                      {backupLoading ? 'A exportar...' : 'Descarregar'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRestoreOpen(true)}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Restaurar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* Restore dialog */}
        <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Restaurar Dados
              </DialogTitle>
              <DialogDescription>
                Carregar um ficheiro <strong>dados.json</strong> (da pasta backup do ZIP) para restaurar os dados na base de dados.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Atenção</p>
                  <p className="mt-1">Os registos existentes com o mesmo ID serão atualizados. Registos novos serão adicionados. Nenhum dado existente será eliminado.</p>
                </div>
              </div>
              <div>
                <input
                  id="restore-file"
                  type="file"
                  accept=".json"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  disabled={restoreLoading}
                />
              </div>
              <Button
                className="w-full"
                disabled={restoreLoading}
                onClick={async () => {
                  const input = document.getElementById('restore-file') as HTMLInputElement;
                  const file = input?.files?.[0];
                  if (!file) {
                    toast.error('Selecione um ficheiro dados.json');
                    return;
                  }
                  setRestoreLoading(true);
                  try {
                    const text = await file.text();
                    const json = JSON.parse(text);
                    const payload = json?.data ? json : { data: json };
                    const res = await fetch('/api/backup/restore', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result?.error ?? 'Erro');
                    toast.success(result?.message ?? 'Restauro concluído');
                    setRestoreOpen(false);
                    window.location.reload();
                  } catch (err: any) {
                    toast.error(err?.message ?? 'Erro ao restaurar dados');
                  } finally {
                    setRestoreLoading(false);
                  }
                }}
              >
                {restoreLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {restoreLoading ? 'A restaurar...' : 'Iniciar Restauro'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
