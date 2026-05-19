'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { FadeIn } from '@/components/ui/animate';
import { FileText, Plus, Download, Loader2, Filter, X, MoreHorizontal, Pencil, Eye } from 'lucide-react';
import { toast } from 'sonner';

const categorias: Record<string, string> = {
  EDP: 'EDP',
  LIMPEZA: 'Limpeza',
  JARDINAGEM: 'Jardinagem',
  ASSISTENCIA_TECNICA: 'Assistência Técnica',
  DESPESAS_ADMINISTRATIVAS: 'Desp. Administrativas',
  DESPESAS_BANCARIAS: 'Desp. Bancárias',
  FUNDO_RESERVA: 'Fundo de Reserva',
  OUTROS: 'Outros',
};

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

const metodosPagamento = ['Transferência', 'Multibanco', 'MBWay', 'Numerário', 'Cheque'];

const emptyForm = {
  descricao: '', categoria: 'EDP', valor: '', dataEmissao: '', dataPagamento: '', fornecedor: '', numeroFatura: '', paga: false, metodoPagamento: 'Transferência', observacoes: '',
};

export function DespesasClient() {
  const [despesas, setDespesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [selectedCategoria, setSelectedCategoria] = useState('all');
  const [formData, setFormData] = useState<any>({ ...emptyForm });

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({ ...emptyForm });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetch(`/api/despesas?ano=${ano}`)
      .then(r => r?.json?.())
      .then(d => setDespesas(d ?? []))
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [ano]);

  const handleSubmit = async () => {
    if (!formData?.descricao || !formData?.valor || !formData?.dataEmissao) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    try {
      const res = await fetch('/api/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, ano: Number(ano) }),
      });
      if (res?.ok) {
        toast.success('Despesa registada com sucesso');
        setDialogOpen(false);
        setFormData({ ...emptyForm });
        loadData();
      } else {
        toast.error('Erro ao registar despesa');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao registar despesa');
    }
  };

  const openEditDialog = (d: any) => {
    setEditingDespesa(d);
    setEditForm({
      descricao: d?.descricao ?? '',
      categoria: d?.categoria ?? 'EDP',
      valor: d?.valor != null ? String(d.valor) : '',
      dataEmissao: toDateInput(d?.dataEmissao),
      dataPagamento: toDateInput(d?.dataPagamento),
      fornecedor: d?.fornecedor ?? '',
      numeroFatura: d?.numeroFatura ?? '',
      paga: !!d?.paga,
      metodoPagamento: d?.metodoPagamento || 'Transferência',
      observacoes: d?.observacoes ?? '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDespesa?.id) return;
    if (!editForm?.descricao || !editForm?.valor || !editForm?.dataEmissao) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/despesas/${editingDespesa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res?.ok) {
        toast.success('Despesa atualizada');
        setEditDialogOpen(false);
        setEditingDespesa(null);
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? 'Erro ao atualizar despesa');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao atualizar despesa');
    } finally {
      setSavingEdit(false);
    }
  };

  const generateDespesaPdf = async (despesaId: string, mode: 'download' | 'view') => {
    if (mode === 'download') setGeneratingPdf(despesaId);
    else setViewingPdf(despesaId);
    try {
      const res = await fetch('/api/recibos-despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ despesaId }),
      });
      if (!res?.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData?.error ?? 'Erro ao gerar documento');
        return;
      }
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/pdf')) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData?.error ?? 'Erro ao gerar documento');
        return;
      }
      const blob = await res.blob();
      const url = window?.URL?.createObjectURL?.(blob);
      if (!url) return;
      if (mode === 'download') {
        const a = document.createElement('a');
        a.href = url;
        a.download = `despesa_${despesaId?.slice?.(-6) ?? ''}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Documento descarregado');
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar documento');
    } finally {
      setGeneratingPdf(null);
      setViewingPdf(null);
    }
  };

  const despesasFiltradas = useMemo(() => {
    if (selectedCategoria === 'all') return despesas ?? [];
    return (despesas ?? []).filter((d: any) => (d?.categoria ?? '') === selectedCategoria);
  }, [despesas, selectedCategoria]);

  const totalDespesas = (despesasFiltradas ?? []).reduce((acc: number, d: any) => acc + (d?.valor ?? 0), 0);
  const totalPagas = (despesasFiltradas ?? []).filter((d: any) => d?.paga).reduce((acc: number, d: any) => acc + (d?.valor ?? 0), 0);

  const hasActiveFilter = selectedCategoria !== 'all';

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-tight font-bold">Despesas</h1>
            <p className="text-muted-foreground text-sm mt-1">Registo e controlo de despesas do condomínio</p>
          </div>
          <div className="flex gap-2">
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
            </Select>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova Despesa
            </Button>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total {hasActiveFilter ? 'Filtrado' : 'Despesas'}</p>
            <p className="text-lg font-bold font-mono text-red-500">{formatCurrency(totalDespesas)}</p>
          </CardContent>
        </Card>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Pagas</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(totalPagas)}</p>
          </CardContent>
        </Card>
      </div>

      <FadeIn delay={0.1}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
                <Filter className="h-4 w-4" />
                Filtro:
              </div>
              <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {Object.entries(categorias).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilter && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedCategoria('all')} className="shrink-0">
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Nº Doc.</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8">A carregar...</TableCell></TableRow>
                  ) : (despesasFiltradas?.length ?? 0) === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilter ? 'Sem despesas nesta categoria' : 'Sem despesas registadas'}
                    </TableCell></TableRow>
                  ) : (
                    (despesasFiltradas ?? []).map((d: any) => {
                      const isBusy = generatingPdf === d?.id || viewingPdf === d?.id;
                      return (
                        <TableRow key={d?.id ?? Math.random()}>
                          <TableCell className="font-medium">{d?.descricao ?? ''}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{categorias[d?.categoria ?? ''] ?? d?.categoria ?? ''}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{d?.fornecedor ?? '-'}</TableCell>
                          <TableCell className="text-sm">{formatDate(d?.dataEmissao)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatCurrency(d?.valor)}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={d?.paga ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-amber-100 text-amber-700 border-0'}>
                              {d?.paga ? 'Paga' : 'Pendente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{d?.metodoPagamento ?? '-'}</TableCell>
                          <TableCell className="text-sm font-mono">{d?.numeroDocumento ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generateDespesaPdf(d?.id ?? '', 'view')}
                                disabled={isBusy}
                                title="Ver documento (nova tab)"
                              >
                                {viewingPdf === d?.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generateDespesaPdf(d?.id ?? '', 'download')}
                                disabled={isBusy}
                                title="Descarregar documento"
                              >
                                {generatingPdf === d?.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" disabled={isBusy} title="Mais opções">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(d)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => generateDespesaPdf(d?.id ?? '', 'view')}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver documento
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => generateDespesaPdf(d?.id ?? '', 'download')}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Descarregar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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

      {/* New expense dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={formData?.descricao ?? ''} onChange={(e: any) => setFormData((prev: any) => ({ ...(prev ?? {}), descricao: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={formData?.categoria ?? 'EDP'} onValueChange={(v: string) => setFormData((prev: any) => ({ ...(prev ?? {}), categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categorias ?? {}).map(([k, v]: any) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (€) *</Label>
              <Input type="number" step="0.01" value={formData?.valor ?? ''} onChange={(e: any) => setFormData((prev: any) => ({ ...(prev ?? {}), valor: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Data Emissão *</Label>
              <Input type="date" value={formData?.dataEmissao ?? ''} onChange={(e: any) => setFormData((prev: any) => ({ ...(prev ?? {}), dataEmissao: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input value={formData?.fornecedor ?? ''} onChange={(e: any) => setFormData((prev: any) => ({ ...(prev ?? {}), fornecedor: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Nº Fatura</Label>
              <Input value={formData?.numeroFatura ?? ''} onChange={(e: any) => setFormData((prev: any) => ({ ...(prev ?? {}), numeroFatura: e?.target?.value ?? '' }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData?.paga ?? false} onCheckedChange={(v: boolean) => setFormData((prev: any) => ({ ...(prev ?? {}), paga: v }))} />
              <Label>Já paga</Label>
            </div>
            {formData?.paga && (
              <div className="space-y-2">
                <Label>Data Pagamento</Label>
                <Input type="date" value={formData?.dataPagamento ?? ''} onChange={(e: any) => setFormData((prev: any) => ({ ...(prev ?? {}), dataPagamento: e?.target?.value ?? '' }))} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select value={formData?.metodoPagamento || 'Transferência'} onValueChange={(v: string) => setFormData((prev: any) => ({ ...(prev ?? {}), metodoPagamento: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {metodosPagamento.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} className="w-full">
              <FileText className="h-4 w-4 mr-1" /> Registar Despesa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit expense dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingDespesa(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
            <DialogDescription>
              {editingDespesa ? (
                <span>
                  {editingDespesa?.numeroDocumento ? `${editingDespesa.numeroDocumento} · ` : ''}
                  {formatCurrency(editingDespesa?.valor)}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={editForm?.descricao ?? ''} onChange={(e: any) => setEditForm((prev: any) => ({ ...(prev ?? {}), descricao: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={editForm?.categoria ?? 'EDP'} onValueChange={(v: string) => setEditForm((prev: any) => ({ ...(prev ?? {}), categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categorias ?? {}).map(([k, v]: any) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (€) *</Label>
              <Input type="number" step="0.01" value={editForm?.valor ?? ''} onChange={(e: any) => setEditForm((prev: any) => ({ ...(prev ?? {}), valor: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Data Emissão *</Label>
              <Input type="date" value={editForm?.dataEmissao ?? ''} onChange={(e: any) => setEditForm((prev: any) => ({ ...(prev ?? {}), dataEmissao: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input value={editForm?.fornecedor ?? ''} onChange={(e: any) => setEditForm((prev: any) => ({ ...(prev ?? {}), fornecedor: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Nº Fatura</Label>
              <Input value={editForm?.numeroFatura ?? ''} onChange={(e: any) => setEditForm((prev: any) => ({ ...(prev ?? {}), numeroFatura: e?.target?.value ?? '' }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editForm?.paga ?? false} onCheckedChange={(v: boolean) => setEditForm((prev: any) => ({ ...(prev ?? {}), paga: v, dataPagamento: v ? (prev?.dataPagamento ?? '') : '' }))} />
              <Label>Já paga</Label>
            </div>
            {editForm?.paga && (
              <div className="space-y-2">
                <Label>Data Pagamento</Label>
                <Input type="date" value={editForm?.dataPagamento ?? ''} onChange={(e: any) => setEditForm((prev: any) => ({ ...(prev ?? {}), dataPagamento: e?.target?.value ?? '' }))} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select value={editForm?.metodoPagamento || 'Transferência'} onValueChange={(v: string) => setEditForm((prev: any) => ({ ...(prev ?? {}), metodoPagamento: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {metodosPagamento.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={editForm?.observacoes ?? ''} onChange={(e: any) => setEditForm((prev: any) => ({ ...(prev ?? {}), observacoes: e?.target?.value ?? '' }))} />
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
