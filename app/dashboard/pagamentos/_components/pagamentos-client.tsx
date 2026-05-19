'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FadeIn } from '@/components/ui/animate';
import { Receipt, Plus, Download, Loader2, Filter, X, MoreHorizontal, Pencil, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';

function formatCurrency(val: number | null | undefined): string {
  return (val ?? 0)?.toLocaleString?.('pt-PT', { style: 'currency', currency: 'EUR' }) ?? '0,00 €';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try { return new Date(dateStr)?.toLocaleDateString?.('pt-PT') ?? '-'; } catch { return '-'; }
}

function toDateInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch { return ''; }
}

export function PagamentosClient() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [fracoes, setFracoes] = useState<any[]>([]);
  const [cotas, setCotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [selectedFracaoFilter, setSelectedFracaoFilter] = useState('all');

  const [selectedCotaIds, setSelectedCotaIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    fracaoId: '', valor: '', dataPagamento: '', metodoPagamento: 'Transferência', referencia: '', observacoes: '',
  });

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPagamento, setEditingPagamento] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ dataPagamento: '', metodoPagamento: 'Transferência', referencia: '', observacoes: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = () => {
    setLoading(true);
    const pagsUrl = isAdmin && selectedFracaoFilter !== 'all'
      ? `/api/pagamentos?fracaoId=${selectedFracaoFilter}`
      : '/api/pagamentos';
    Promise.all([
      fetch(pagsUrl).then(r => r?.json?.()),
      isAdmin ? fetch('/api/fracoes').then(r => r?.json?.()) : Promise.resolve([]),
    ])
      .then(([pags, fracs]: any) => { setPagamentos(pags ?? []); setFracoes(fracs ?? []); })
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [isAdmin, selectedFracaoFilter]);

  useEffect(() => {
    if (formData?.fracaoId) {
      fetch(`/api/cotas?fracaoId=${formData.fracaoId}&ano=${new Date().getFullYear()}`)
        .then(r => r?.json?.())
        .then(d => { setCotas((d ?? []).filter((c: any) => c?.status !== 'PAGO')); setSelectedCotaIds([]); })
        .catch(() => { setCotas([]); setSelectedCotaIds([]); });
    }
  }, [formData?.fracaoId]);

  // Auto-calculate total when selecting/deselecting cotas
  useEffect(() => {
    if (selectedCotaIds.length > 0) {
      const total = (cotas ?? [])
        .filter((c: any) => selectedCotaIds.includes(c?.id))
        .reduce((sum: number, c: any) => sum + (c?.valorTotal ?? 0), 0);
      setFormData(prev => ({ ...prev, valor: total.toFixed(2) }));
    }
  }, [selectedCotaIds, cotas]);

  const handleSubmit = async () => {
    if (!formData?.fracaoId || !formData?.valor || !formData?.dataPagamento) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    try {
      const res = await fetch('/api/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, cotaIds: selectedCotaIds }),
      });
      if (res?.ok) {
        toast.success('Pagamento registado com sucesso');
        setDialogOpen(false);
        setFormData({ fracaoId: '', valor: '', dataPagamento: '', metodoPagamento: 'Transferência', referencia: '', observacoes: '' });
        setSelectedCotaIds([]);
        loadData();
      } else {
        const err = await res?.json?.();
        toast.error(err?.error ?? 'Erro ao registar pagamento');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao registar pagamento');
    }
  };

  const openEditDialog = (p: any) => {
    setEditingPagamento(p);
    setEditForm({
      dataPagamento: toDateInput(p?.dataPagamento),
      metodoPagamento: p?.metodoPagamento ?? 'Transferência',
      referencia: p?.referencia ?? '',
      observacoes: p?.observacoes ?? '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPagamento?.id) return;
    if (!editForm?.dataPagamento) {
      toast.error('Data de pagamento é obrigatória');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/pagamentos/${editingPagamento.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res?.ok) {
        toast.success('Pagamento atualizado');
        setEditDialogOpen(false);
        setEditingPagamento(null);
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? 'Erro ao atualizar pagamento');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao atualizar pagamento');
    } finally {
      setSavingEdit(false);
    }
  };

  // Fetches the receipt PDF blob and performs either download or view in new tab
  const generateReceiptPdf = async (
    pagamentoId: string,
    mode: 'download' | 'view',
  ) => {
    if (mode === 'download') setGeneratingReceipt(pagamentoId);
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
        // Give the new tab a moment to load before revoking
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar recibo');
    } finally {
      setGeneratingReceipt(null);
      setViewingReceipt(null);
    }
  };

  const mesesNomes = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const hasActiveFilter = isAdmin && selectedFracaoFilter !== 'all';

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-tight font-bold">Pagamentos</h1>
            <p className="text-muted-foreground text-sm mt-1">Registo e consulta de pagamentos de cotas</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Registar Pagamento
            </Button>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-0">
            {isAdmin && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
                  <Filter className="h-4 w-4" />
                  Filtro:
                </div>
                <Select value={selectedFracaoFilter} onValueChange={setSelectedFracaoFilter}>
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
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFracaoFilter('all')} className="shrink-0">
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
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Nº Recibo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
                  ) : (pagamentos?.length ?? 0) === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilter ? 'Sem pagamentos para a fração selecionada' : 'Sem pagamentos'}
                    </TableCell></TableRow>
                  ) : (
                    (pagamentos ?? []).map((p: any) => {
                      const isBusy = generatingReceipt === p?.id || viewingReceipt === p?.id;
                      return (
                        <TableRow key={p?.id ?? Math.random()}>
                          <TableCell className="font-medium">Fração {p?.fracao?.letra ?? '?'}</TableCell>
                          <TableCell>{formatDate(p?.dataPagamento)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-emerald-600">{formatCurrency(p?.valor)}</TableCell>
                          <TableCell>{p?.metodoPagamento ?? '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p?.referencia ?? '-'}</TableCell>
                          <TableCell className="text-sm font-mono">{p?.numeroRecibo ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generateReceiptPdf(p?.id ?? '', 'view')}
                                disabled={isBusy}
                                title="Ver recibo (nova tab)"
                              >
                                {viewingReceipt === p?.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generateReceiptPdf(p?.id ?? '', 'download')}
                                disabled={isBusy}
                                title="Descarregar recibo"
                              >
                                {generatingReceipt === p?.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                              {isAdmin && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" disabled={isBusy} title="Mais opções">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditDialog(p)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => generateReceiptPdf(p?.id ?? '', 'view')}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver recibo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => generateReceiptPdf(p?.id ?? '', 'download')}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Descarregar recibo
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* New payment dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fração *</Label>
              <Select value={formData?.fracaoId ?? ''} onValueChange={(v: string) => setFormData(prev => ({ ...(prev ?? {}), fracaoId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar fração" /></SelectTrigger>
                <SelectContent>
                  {(fracoes ?? []).map((f: any) => <SelectItem key={f?.id ?? ''} value={f?.id ?? ''}>Fração {f?.letra ?? '?'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(cotas?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <Label>Cotas a pagar</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                  {(cotas ?? []).length > 1 && (
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 transition-colors border-b pb-2 mb-1">
                      <input
                        type="checkbox"
                        checked={selectedCotaIds.length === (cotas ?? []).length}
                        onChange={() => {
                          if (selectedCotaIds.length === (cotas ?? []).length) {
                            setSelectedCotaIds([]);
                          } else {
                            setSelectedCotaIds((cotas ?? []).map((c: any) => c?.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 accent-primary"
                      />
                      <span className="text-sm flex-1 font-medium">Selecionar todos</span>
                      <span className="text-sm font-mono text-muted-foreground">{formatCurrency(
                        (cotas ?? []).reduce((sum: number, c: any) => sum + (c?.valorTotal ?? 0), 0)
                      )}</span>
                    </label>
                  )}
                  {(cotas ?? []).map((c: any) => {
                    const isChecked = selectedCotaIds.includes(c?.id);
                    return (
                      <label key={c?.id ?? ''} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedCotaIds(prev =>
                              isChecked ? prev.filter(id => id !== c?.id) : [...prev, c?.id]
                            );
                          }}
                          className="h-4 w-4 rounded border-gray-300 accent-primary"
                        />
                        <span className="text-sm flex-1">{mesesNomes[c?.mes ?? 0] ?? ''}</span>
                        <span className="text-sm font-mono text-muted-foreground">{formatCurrency(c?.valorTotal)}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedCotaIds.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedCotaIds.length} meses selecionados — Total: {formatCurrency(
                      (cotas ?? []).filter((c: any) => selectedCotaIds.includes(c?.id)).reduce((sum: number, c: any) => sum + (c?.valorTotal ?? 0), 0)
                    )}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Valor (€) *</Label>
              <Input type="number" step="0.01" value={formData?.valor ?? ''} onChange={(e: any) => setFormData(prev => ({ ...(prev ?? {}), valor: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={formData?.dataPagamento ?? ''} onChange={(e: any) => setFormData(prev => ({ ...(prev ?? {}), dataPagamento: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={formData?.metodoPagamento ?? ''} onValueChange={(v: string) => setFormData(prev => ({ ...(prev ?? {}), metodoPagamento: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                  <SelectItem value="Multibanco">Multibanco</SelectItem>
                  <SelectItem value="MBWay">MBWay</SelectItem>
                  <SelectItem value="Numerário">Numerário</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Referência</Label>
              <Input value={formData?.referencia ?? ''} onChange={(e: any) => setFormData(prev => ({ ...(prev ?? {}), referencia: e?.target?.value ?? '' }))} placeholder="Nº transferência, etc." />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={formData?.observacoes ?? ''} onChange={(e: any) => setFormData(prev => ({ ...(prev ?? {}), observacoes: e?.target?.value ?? '' }))} />
            </div>
            <Button onClick={handleSubmit} className="w-full">
              <Receipt className="h-4 w-4 mr-1" /> Registar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit payment dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingPagamento(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Pagamento</DialogTitle>
            <DialogDescription>
              {editingPagamento ? (
                <span>
                  Fração {editingPagamento?.fracao?.letra ?? '?'} · {formatCurrency(editingPagamento?.valor)}
                  {editingPagamento?.numeroRecibo ? ` · ${editingPagamento.numeroRecibo}` : ''}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
              <FileText className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                A fração, valor e cotas associadas não são editáveis para preservar a coerência com as cotas marcadas como pagas. Caso precise de alterar esses campos, elimine o pagamento e registe-o novamente.
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={editForm?.dataPagamento ?? ''} onChange={(e: any) => setEditForm(prev => ({ ...(prev ?? {}), dataPagamento: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={editForm?.metodoPagamento ?? ''} onValueChange={(v: string) => setEditForm(prev => ({ ...(prev ?? {}), metodoPagamento: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                  <SelectItem value="Multibanco">Multibanco</SelectItem>
                  <SelectItem value="MBWay">MBWay</SelectItem>
                  <SelectItem value="Numerário">Numerário</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Referência</Label>
              <Input value={editForm?.referencia ?? ''} onChange={(e: any) => setEditForm(prev => ({ ...(prev ?? {}), referencia: e?.target?.value ?? '' }))} placeholder="Nº transferência, etc." />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={editForm?.observacoes ?? ''} onChange={(e: any) => setEditForm(prev => ({ ...(prev ?? {}), observacoes: e?.target?.value ?? '' }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={savingEdit}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
