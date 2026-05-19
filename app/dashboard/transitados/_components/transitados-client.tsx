'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Landmark, AlertCircle, Plus, CheckCircle, Save, Banknote, ShieldAlert, Receipt, Loader2, Filter, X, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

function formatCurrency(val: number | null | undefined): string {
  return (val ?? 0)?.toLocaleString?.('pt-PT', { style: 'currency', currency: 'EUR' }) ?? '0,00 €';
}

export function TransitadosClient() {
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(currentYear);
  const [saldo, setSaldo] = useState<any>(null);
  const [dividas, setDividas] = useState<any[]>([]);
  const [fracoes, setFracoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSaldo, setSavingSaldo] = useState(false);
  const [showDividaDialog, setShowDividaDialog] = useState(false);

  const [saldoForm, setSaldoForm] = useState({ saldoContaCorrente: '', saldoFundoReserva: '', observacoes: '' });
  const [dividaForm, setDividaForm] = useState({ fracaoId: '', tipo: 'COTAS', descricao: '', valor: '', anoReferencia: String(currentYear - 1), observacoes: '' });

  // Liquidation dialog state
  const [liquidarDialog, setLiquidarDialog] = useState<{ open: boolean; divida: any | null }>({ open: false, divida: null });
  const [liquidarForm, setLiquidarForm] = useState({
    dataPagamento: new Date().toISOString().slice(0, 10),
    metodoPagamento: 'Transferência',
    referencia: '',
    observacoes: '',
  });
  const [liquidarSubmitting, setLiquidarSubmitting] = useState(false);
  const [reabrirDialog, setReabrirDialog] = useState<{ open: boolean; divida: any | null }>({ open: false, divida: null });

  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{ open: boolean; divida: any | null }>({ open: false, divida: null });
  const [editForm, setEditForm] = useState({ fracaoId: '', tipo: 'COTAS', descricao: '', valor: '', anoReferencia: '', observacoes: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; divida: any | null }>({ open: false, divida: null });
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Filters
  const [fracaoFilter, setFracaoFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/saldos-transitados?ano=${ano}`).then(r => r?.json?.()),
      fetch('/api/dividas-transitadas').then(r => r?.json?.()),
      fetch('/api/fracoes').then(r => r?.json?.()),
    ])
      .then(([s, d, f]: any) => {
        setSaldo(s ?? null);
        if (s) {
          setSaldoForm({
            saldoContaCorrente: String(s?.saldoContaCorrente ?? 0),
            saldoFundoReserva: String(s?.saldoFundoReserva ?? 0),
            observacoes: s?.observacoes ?? '',
          });
        } else {
          setSaldoForm({ saldoContaCorrente: '', saldoFundoReserva: '', observacoes: '' });
        }
        setDividas(d ?? []);
        setFracoes(f ?? []);
      })
      .catch((err: any) => console.error('Fetch error:', err))
      .finally(() => setLoading(false));
  }, [ano]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveSaldo = async () => {
    setSavingSaldo(true);
    try {
      const res = await fetch('/api/saldos-transitados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano, ...saldoForm }),
      });
      if (res?.ok) {
        toast.success('Saldos transitados guardados com sucesso');
        fetchData();
      } else {
        toast.error('Erro ao guardar saldos');
      }
    } catch { toast.error('Erro ao guardar saldos'); }
    finally { setSavingSaldo(false); }
  };

  const handleAddDivida = async () => {
    if (!dividaForm?.fracaoId || !dividaForm?.descricao || !dividaForm?.valor || !dividaForm?.anoReferencia) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      const res = await fetch('/api/dividas-transitadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dividaForm),
      });
      if (res?.ok) {
        toast.success('Dívida registada com sucesso');
        setShowDividaDialog(false);
        setDividaForm({ fracaoId: '', tipo: 'COTAS', descricao: '', valor: '', anoReferencia: String(currentYear - 1), observacoes: '' });
        fetchData();
      } else {
        toast.error('Erro ao registar dívida');
      }
    } catch { toast.error('Erro ao registar dívida'); }
  };

  const openLiquidarDialog = (divida: any) => {
    setLiquidarForm({
      dataPagamento: new Date().toISOString().slice(0, 10),
      metodoPagamento: 'Transferência',
      referencia: '',
      observacoes: '',
    });
    setLiquidarDialog({ open: true, divida });
  };

  const handleLiquidarSubmit = async () => {
    const divida = liquidarDialog?.divida;
    if (!divida?.id) return;
    if (!liquidarForm?.dataPagamento) {
      toast.error('Data de pagamento obrigatória');
      return;
    }
    setLiquidarSubmitting(true);
    try {
      const res = await fetch('/api/dividas-transitadas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: divida.id,
          liquidada: true,
          dataPagamento: liquidarForm?.dataPagamento,
          metodoPagamento: liquidarForm?.metodoPagamento || 'Transferência',
          referencia: liquidarForm?.referencia || null,
          observacoes: liquidarForm?.observacoes || null,
        }),
      });
      const result = await res?.json?.();
      if (res?.ok) {
        const recibo = result?.pagamentoCriado?.numeroRecibo;
        toast.success(
          recibo
            ? `Dívida liquidada. Recibo ${recibo} criado — disponível em Pagamentos.`
            : 'Dívida liquidada e pagamento registado.'
        );
        setLiquidarDialog({ open: false, divida: null });
        fetchData();
      } else {
        toast.error(result?.error ?? 'Erro ao liquidar dívida');
      }
    } catch (err: any) {
      toast.error('Erro ao liquidar dívida');
    } finally {
      setLiquidarSubmitting(false);
    }
  };

  const handleReabrirConfirm = async () => {
    const divida = reabrirDialog?.divida;
    if (!divida?.id) return;
    try {
      const res = await fetch('/api/dividas-transitadas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: divida.id, liquidada: false }),
      });
      const result = await res?.json?.();
      if (res?.ok) {
        toast.success('Dívida reaberta. O pagamento e recibo associados foram anulados.');
        setReabrirDialog({ open: false, divida: null });
        fetchData();
      } else {
        toast.error(result?.error ?? 'Erro ao reabrir dívida');
      }
    } catch {
      toast.error('Erro ao reabrir dívida');
    }
  };

  const openEditDialog = (divida: any) => {
    setEditForm({
      fracaoId: divida?.fracaoId ?? '',
      tipo: divida?.tipo ?? 'COTAS',
      descricao: divida?.descricao ?? '',
      valor: String(divida?.valor ?? ''),
      anoReferencia: String(divida?.anoReferencia ?? ''),
      observacoes: divida?.observacoes ?? '',
    });
    setEditDialog({ open: true, divida });
  };

  const handleEditSubmit = async () => {
    const divida = editDialog?.divida;
    if (!divida?.id) return;
    if (!editForm?.fracaoId || !editForm?.descricao || !editForm?.valor || !editForm?.anoReferencia) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await fetch('/api/dividas-transitadas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: divida.id,
          fracaoId: editForm?.fracaoId,
          tipo: editForm?.tipo,
          descricao: editForm?.descricao,
          valor: editForm?.valor,
          anoReferencia: editForm?.anoReferencia,
          observacoes: editForm?.observacoes,
        }),
      });
      const result = await res?.json?.();
      if (res?.ok) {
        toast.success('Dívida atualizada com sucesso');
        setEditDialog({ open: false, divida: null });
        fetchData();
      } else {
        toast.error(result?.error ?? 'Erro ao editar dívida');
      }
    } catch {
      toast.error('Erro ao editar dívida');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const divida = deleteDialog?.divida;
    if (!divida?.id) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/dividas-transitadas?id=${encodeURIComponent(divida.id)}`, {
        method: 'DELETE',
      });
      const result = await res?.json?.().catch(() => ({}));
      if (res?.ok) {
        toast.success('Dívida eliminada com sucesso');
        setDeleteDialog({ open: false, divida: null });
        fetchData();
      } else {
        toast.error(result?.error ?? 'Erro ao eliminar dívida');
      }
    } catch {
      toast.error('Erro ao eliminar dívida');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const totalDividasPendentes = (dividas ?? []).filter((d: any) => !d?.liquidada).reduce((acc: number, d: any) => acc + (d?.valor ?? 0), 0);
  const totalDividasLiquidadas = (dividas ?? []).filter((d: any) => d?.liquidada).reduce((acc: number, d: any) => acc + (d?.valor ?? 0), 0);
  const saldoTotal = (parseFloat(saldoForm?.saldoContaCorrente) || 0) + (parseFloat(saldoForm?.saldoFundoReserva) || 0);

  // Apply filters to the debts list
  const dividasFiltered = (dividas ?? []).filter((d: any) => {
    if (fracaoFilter !== 'all' && d?.fracaoId !== fracaoFilter) return false;
    if (tipoFilter !== 'all' && d?.tipo !== tipoFilter) return false;
    if (estadoFilter === 'pendentes' && d?.liquidada) return false;
    if (estadoFilter === 'liquidadas' && !d?.liquidada) return false;
    return true;
  });
  const hasActiveFilter = fracaoFilter !== 'all' || tipoFilter !== 'all' || estadoFilter !== 'all';

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i: number) => (
          <Card key={i}><CardContent className="p-6"><div className="h-20 animate-pulse bg-muted rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl tracking-tight font-bold">Saldos Transitados</h1>
            <p className="text-muted-foreground text-sm mt-1">Valores herdados da gestão anterior</p>
          </div>
          <Select value={String(ano)} onValueChange={(v: string) => setAno(parseInt(v))}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1, currentYear - 2].map((y: number) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SlideIn from="bottom" delay={0}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Saldo Bancário Total</p>
                  <p className="text-xl font-bold mt-1 font-mono text-primary">{formatCurrency(saldoTotal)}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Landmark className="h-5 w-5 text-primary" />
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
                  <p className="text-xs text-muted-foreground font-medium">Dívidas Pendentes</p>
                  <p className="text-xl font-bold mt-1 font-mono text-red-500">{formatCurrency(totalDividasPendentes)}</p>
                </div>
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideIn>
        <SlideIn from="bottom" delay={0.2}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Dívidas Liquidadas</p>
                  <p className="text-xl font-bold mt-1 font-mono text-emerald-600">{formatCurrency(totalDividasLiquidadas)}</p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideIn>
      </div>

      {/* Bank balance section */}
      <FadeIn delay={0.2}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              Saldo Bancário Transitado — {ano}
            </CardTitle>
            <CardDescription>Saldos da conta corrente e fundo de reserva herdados da gestão anterior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Saldo Conta Corrente (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={saldoForm?.saldoContaCorrente ?? ''}
                  onChange={(e: any) => setSaldoForm(prev => ({ ...(prev ?? {}), saldoContaCorrente: e?.target?.value ?? '' }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Saldo Fundo de Reserva (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={saldoForm?.saldoFundoReserva ?? ''}
                  onChange={(e: any) => setSaldoForm(prev => ({ ...(prev ?? {}), saldoFundoReserva: e?.target?.value ?? '' }))}
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Ex: Valores recebidos da empresa X em janeiro de 2026"
                value={saldoForm?.observacoes ?? ''}
                onChange={(e: any) => setSaldoForm(prev => ({ ...(prev ?? {}), observacoes: e?.target?.value ?? '' }))}
                rows={2}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveSaldo} disabled={savingSaldo}>
                {savingSaldo ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    A guardar...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Saldos
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Debts section */}
      <FadeIn delay={0.3}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Dívidas Transitadas
                </CardTitle>
                <CardDescription className="mt-1">Dívidas de cotas e outras dívidas herdadas da gestão anterior</CardDescription>
              </div>
              <Button onClick={() => setShowDividaDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Registar Dívida
              </Button>
            </div>
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
                      onClick={() => { setFracaoFilter('all'); setTipoFilter('all'); setEstadoFilter('all'); }}
                    >
                      <X className="h-3 w-3 mr-1" /> Limpar
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fração</Label>
                    <Select value={fracaoFilter} onValueChange={setFracaoFilter}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as frações</SelectItem>
                        {(fracoes ?? []).map((f: any) => (
                          <SelectItem key={f?.id ?? ''} value={f?.id ?? ''}>Fração {f?.letra ?? '?'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={tipoFilter} onValueChange={setTipoFilter}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="COTAS">Cotas</SelectItem>
                        <SelectItem value="OBRAS">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma dívida transitada registada</p>
            ) : (dividasFiltered ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma dívida corresponde aos filtros selecionados</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fração</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Ano Ref.</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dividasFiltered ?? []).map((d: any) => (
                      <TableRow key={d?.id ?? ''} className={d?.liquidada ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">Fração {d?.fracao?.letra ?? '?'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {d?.tipo === 'OBRAS' ? 'Outros' : 'Cotas'}
                          </Badge>
                        </TableCell>
                        <TableCell>{d?.descricao ?? '-'}</TableCell>
                        <TableCell>{d?.anoReferencia ?? '-'}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(d?.valor)}</TableCell>
                        <TableCell>
                          <Badge variant={d?.liquidada ? 'default' : 'destructive'} className="text-xs">
                            {d?.liquidada ? 'Liquidada' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {d?.liquidada ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReabrirDialog({ open: true, divida: d })}
                              >
                                Reabrir
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => openLiquidarDialog(d)}
                                >
                                  Liquidar
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditDialog(d)}>
                                      <Pencil className="h-4 w-4 mr-2" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={() => setDeleteDialog({ open: true, divida: d })}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                          </div>
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

      {/* Add debt dialog */}
      <Dialog open={showDividaDialog} onOpenChange={setShowDividaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registar Dívida Transitada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Fração *</Label>
              <Select value={dividaForm?.fracaoId ?? ''} onValueChange={(v: string) => setDividaForm(prev => ({ ...(prev ?? {}), fracaoId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar fração" /></SelectTrigger>
                <SelectContent>
                  {(fracoes ?? []).map((f: any) => <SelectItem key={f?.id ?? ''} value={f?.id ?? ''}>Fração {f?.letra ?? '?'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Dívida *</Label>
              <Select value={dividaForm?.tipo ?? 'COTAS'} onValueChange={(v: string) => setDividaForm(prev => ({ ...(prev ?? {}), tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COTAS">Cotas em Atraso</SelectItem>
                  <SelectItem value="OBRAS">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={dividaForm?.descricao ?? ''} onChange={(e: any) => setDividaForm(prev => ({ ...(prev ?? {}), descricao: e?.target?.value ?? '' }))} placeholder={dividaForm?.tipo === 'OBRAS' ? 'Ex: Outra dívida transitada' : 'Ex: Cotas em atraso Jan-Jun 2025'} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (€) *</Label>
                <Input type="number" step="0.01" value={dividaForm?.valor ?? ''} onChange={(e: any) => setDividaForm(prev => ({ ...(prev ?? {}), valor: e?.target?.value ?? '' }))} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Ano Referência *</Label>
                <Input type="number" value={dividaForm?.anoReferencia ?? ''} onChange={(e: any) => setDividaForm(prev => ({ ...(prev ?? {}), anoReferencia: e?.target?.value ?? '' }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={dividaForm?.observacoes ?? ''} onChange={(e: any) => setDividaForm(prev => ({ ...(prev ?? {}), observacoes: e?.target?.value ?? '' }))} placeholder="Detalhes adicionais" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDividaDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddDivida}>
              <Plus className="h-4 w-4 mr-1" /> Registar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Liquidate dialog */}
      <Dialog open={liquidarDialog?.open ?? false} onOpenChange={(open: boolean) => { if (!open) setLiquidarDialog({ open: false, divida: null }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-600" />
              Liquidar Dívida Transitada
            </DialogTitle>
            <DialogDescription>
              Ao liquidar, será automaticamente criado um pagamento com recibo sequencial associado.
            </DialogDescription>
          </DialogHeader>
          {liquidarDialog?.divida && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/40 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fração:</span>
                  <span className="font-medium">Fração {liquidarDialog?.divida?.fracao?.letra ?? '?'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{liquidarDialog?.divida?.tipo === 'OBRAS' ? 'Outros' : 'Cotas'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descrição:</span>
                  <span className="font-medium">{liquidarDialog?.divida?.descricao ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-mono font-semibold text-primary">{formatCurrency(liquidarDialog?.divida?.valor)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Pagamento *</Label>
                  <Input
                    type="date"
                    value={liquidarForm?.dataPagamento ?? ''}
                    onChange={(e: any) => setLiquidarForm(prev => ({ ...prev, dataPagamento: e?.target?.value ?? '' }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Método de Pagamento *</Label>
                  <Select
                    value={liquidarForm?.metodoPagamento ?? 'Transferência'}
                    onValueChange={(v: string) => setLiquidarForm(prev => ({ ...prev, metodoPagamento: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Numerário">Numerário</SelectItem>
                      <SelectItem value="MB WAY">MB WAY</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Referência (opcional)</Label>
                <Input
                  value={liquidarForm?.referencia ?? ''}
                  onChange={(e: any) => setLiquidarForm(prev => ({ ...prev, referencia: e?.target?.value ?? '' }))}
                  placeholder="Ex: TRF-2026-0142"
                />
              </div>
              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={liquidarForm?.observacoes ?? ''}
                  onChange={(e: any) => setLiquidarForm(prev => ({ ...prev, observacoes: e?.target?.value ?? '' }))}
                  rows={2}
                  placeholder="Informação adicional a registar no recibo"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiquidarDialog({ open: false, divida: null })} disabled={liquidarSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleLiquidarSubmit} disabled={liquidarSubmitting}>
              {liquidarSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> A liquidar...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Liquidar e Gerar Recibo
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen confirmation dialog */}
      <Dialog open={reabrirDialog?.open ?? false} onOpenChange={(open: boolean) => { if (!open) setReabrirDialog({ open: false, divida: null }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Reabrir Dívida Transitada
            </DialogTitle>
            <DialogDescription>
              Esta ação irá <strong>eliminar o pagamento e recibo</strong> gerados aquando da liquidação, e voltará a marcar a dívida como pendente. Tem a certeza?
            </DialogDescription>
          </DialogHeader>
          {reabrirDialog?.divida && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fração:</span>
                <span className="font-medium">Fração {reabrirDialog?.divida?.fracao?.letra ?? '?'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descrição:</span>
                <span className="font-medium">{reabrirDialog?.divida?.descricao ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-mono font-semibold">{formatCurrency(reabrirDialog?.divida?.valor)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReabrirDialog({ open: false, divida: null })}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReabrirConfirm}>
              Sim, Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit debt dialog */}
      <Dialog open={editDialog?.open ?? false} onOpenChange={(open: boolean) => { if (!open) setEditDialog({ open: false, divida: null }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Editar Dívida Transitada
            </DialogTitle>
            <DialogDescription>
              Pode alterar a fração, tipo, descrição, valor, ano de referência e observações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Fração *</Label>
              <Select value={editForm?.fracaoId ?? ''} onValueChange={(v: string) => setEditForm(prev => ({ ...(prev ?? {}), fracaoId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar fração" /></SelectTrigger>
                <SelectContent>
                  {(fracoes ?? []).map((f: any) => <SelectItem key={f?.id ?? ''} value={f?.id ?? ''}>Fração {f?.letra ?? '?'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Dívida *</Label>
              <Select value={editForm?.tipo ?? 'COTAS'} onValueChange={(v: string) => setEditForm(prev => ({ ...(prev ?? {}), tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COTAS">Cotas em Atraso</SelectItem>
                  <SelectItem value="OBRAS">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={editForm?.descricao ?? ''}
                onChange={(e: any) => setEditForm(prev => ({ ...(prev ?? {}), descricao: e?.target?.value ?? '' }))}
                placeholder={editForm?.tipo === 'OBRAS' ? 'Ex: Outra dívida transitada' : 'Ex: Cotas em atraso Jan-Jun 2025'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm?.valor ?? ''}
                  onChange={(e: any) => setEditForm(prev => ({ ...(prev ?? {}), valor: e?.target?.value ?? '' }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Ano Referência *</Label>
                <Input
                  type="number"
                  value={editForm?.anoReferencia ?? ''}
                  onChange={(e: any) => setEditForm(prev => ({ ...(prev ?? {}), anoReferencia: e?.target?.value ?? '' }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={editForm?.observacoes ?? ''}
                onChange={(e: any) => setEditForm(prev => ({ ...(prev ?? {}), observacoes: e?.target?.value ?? '' }))}
                placeholder="Detalhes adicionais"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, divida: null })} disabled={editSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={editSubmitting}>
              {editSubmitting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> A guardar...</span>
              ) : (
                <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Guardar alterações</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialog?.open ?? false} onOpenChange={(open: boolean) => { if (!open) setDeleteDialog({ open: false, divida: null }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              Eliminar Dívida Transitada
            </DialogTitle>
            <DialogDescription>
              Esta ação é <strong>irreversível</strong>. A dívida será removida permanentemente do sistema.
            </DialogDescription>
          </DialogHeader>
          {deleteDialog?.divida && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fração:</span>
                <span className="font-medium">Fração {deleteDialog?.divida?.fracao?.letra ?? '?'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium">{deleteDialog?.divida?.tipo === 'OBRAS' ? 'Outros' : 'Cotas'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descrição:</span>
                <span className="font-medium">{deleteDialog?.divida?.descricao ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-mono font-semibold">{formatCurrency(deleteDialog?.divida?.valor)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, divida: null })} disabled={deleteSubmitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteSubmitting}>
              {deleteSubmitting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> A eliminar...</span>
              ) : (
                <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Sim, Eliminar</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
