'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FadeIn } from '@/components/ui/animate';
import {
  Landmark, Wallet, ArrowDownToLine, ArrowUpFromLine,
  Plus, MoreVertical, Pencil, Trash2, Info,
} from 'lucide-react';
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

type Movimento = {
  id: string;
  tipo: 'LEVANTAMENTO' | 'DEPOSITO';
  valor: number;
  data: string;
  descricao: string | null;
  observacoes: string | null;
};

type Saldos = {
  saldoTransitadoCC: number;
  saldoTransitadoFR: number;
  saldoTransitadoTotal: number;
  receitasBanco: number;
  receitasNumerario: number;
  despesasBanco: number;
  despesasNumerario: number;
  totalLevantamentos: number;
  totalDepositos: number;
  saldoBancario: number;
  saldoNumerario: number;
  totalFR: number;
};

const emptyMovForm = {
  tipo: 'LEVANTAMENTO' as 'LEVANTAMENTO' | 'DEPOSITO',
  valor: '',
  data: '',
  descricao: '',
  observacoes: '',
};

export function ContaCorrenteClient() {
  const [saldos, setSaldos] = useState<Saldos | null>(null);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyMovForm });
  const [createSaving, setCreateSaving] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingMov, setEditingMov] = useState<Movimento | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyMovForm });
  const [editSaving, setEditSaving] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingMov, setDeletingMov] = useState<Movimento | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/conta-corrente').then(r => r?.json?.()),
      fetch('/api/movimentos-caixa').then(r => r?.json?.()),
    ])
      .then(([s, m]) => {
        setSaldos(s ?? null);
        setMovimentos(m ?? []);
      })
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ---------- CREATE ----------
  const handleCreate = async () => {
    if (!createForm.valor || !createForm.data) {
      toast.error('Valor e data são obrigatórios');
      return;
    }
    if (Number(createForm.valor) <= 0) {
      toast.error('O valor deve ser positivo');
      return;
    }
    setCreateSaving(true);
    try {
      const res = await fetch('/api/movimentos-caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (res?.ok) {
        toast.success(createForm.tipo === 'LEVANTAMENTO' ? 'Levantamento registado' : 'Depósito registado');
        setCreateOpen(false);
        setCreateForm({ ...emptyMovForm });
        loadData();
      } else {
        const err = await res?.json?.();
        toast.error(err?.error ?? 'Erro ao registar movimento');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao registar movimento');
    } finally {
      setCreateSaving(false);
    }
  };

  // ---------- EDIT ----------
  const openEdit = (m: Movimento) => {
    setEditingMov(m);
    setEditForm({
      tipo: m.tipo,
      valor: String(m.valor),
      data: toDateInput(m.data),
      descricao: m.descricao ?? '',
      observacoes: m.observacoes ?? '',
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingMov?.id) return;
    if (!editForm.valor || !editForm.data) {
      toast.error('Valor e data são obrigatórios');
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/movimentos-caixa/${editingMov.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res?.ok) {
        toast.success('Movimento atualizado');
        setEditOpen(false);
        setEditingMov(null);
        loadData();
      } else {
        const err = await res?.json?.();
        toast.error(err?.error ?? 'Erro ao atualizar');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao atualizar');
    } finally {
      setEditSaving(false);
    }
  };

  // ---------- DELETE ----------
  const openDelete = (m: Movimento) => {
    setDeletingMov(m);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingMov?.id) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/movimentos-caixa/${deletingMov.id}`, { method: 'DELETE' });
      if (res?.ok) {
        toast.success('Movimento eliminado');
        setDeleteOpen(false);
        setDeletingMov(null);
        loadData();
      } else {
        const err = await res?.json?.();
        toast.error(err?.error ?? 'Erro ao eliminar');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao eliminar');
    } finally {
      setDeleteSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse bg-muted rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2].map(i => <Card key={i}><CardContent className="p-6"><div className="h-20 animate-pulse bg-muted rounded" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  const s = saldos;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-tight font-bold">Conta Corrente</h1>
            <p className="text-muted-foreground text-sm mt-1">Saldo bancário e numerário do condomínio</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Movimento
          </Button>
        </div>
      </FadeIn>

      {/* Saldos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FadeIn delay={0.05}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Landmark className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Bancário</p>
                  <p className={`text-xl font-bold font-mono ${(s?.saldoBancario ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(s?.saldoBancario)}
                  </p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground border-t pt-2">
                <div className="flex justify-between">
                  <span>Saldo transitado</span>
                  <span className="font-mono">{formatCurrency(s?.saldoTransitadoTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>+ Receitas (banco)</span>
                  <span className="font-mono text-emerald-600">{formatCurrency(s?.receitasBanco)}</span>
                </div>
                <div className="flex justify-between">
                  <span>− Despesas (banco)</span>
                  <span className="font-mono text-red-500">{formatCurrency(s?.despesasBanco)}</span>
                </div>
                <div className="flex justify-between">
                  <span>− Levantamentos</span>
                  <span className="font-mono text-red-500">{formatCurrency(s?.totalLevantamentos)}</span>
                </div>
                <div className="flex justify-between">
                  <span>+ Depósitos</span>
                  <span className="font-mono text-emerald-600">{formatCurrency(s?.totalDepositos)}</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t">
                <div className="flex items-center gap-1.5 text-xs">
                  <Info className="h-3 w-3 text-blue-500" />
                  <span className="text-muted-foreground">Dos quais <strong className="font-mono text-blue-600">{formatCurrency(s?.totalFR)}</strong> são Fundo de Reserva</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo em Numerário</p>
                  <p className={`text-xl font-bold font-mono ${(s?.saldoNumerario ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(s?.saldoNumerario)}
                  </p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground border-t pt-2">
                <div className="flex justify-between">
                  <span>+ Receitas (numerário)</span>
                  <span className="font-mono text-emerald-600">{formatCurrency(s?.receitasNumerario)}</span>
                </div>
                <div className="flex justify-between">
                  <span>− Despesas (numerário)</span>
                  <span className="font-mono text-red-500">{formatCurrency(s?.despesasNumerario)}</span>
                </div>
                <div className="flex justify-between">
                  <span>+ Levantamentos</span>
                  <span className="font-mono text-emerald-600">{formatCurrency(s?.totalLevantamentos)}</span>
                </div>
                <div className="flex justify-between">
                  <span>− Depósitos</span>
                  <span className="font-mono text-red-500">{formatCurrency(s?.totalDepositos)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Tabela Movimentos */}
      <FadeIn delay={0.15}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Movimentos Bancários</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-[60px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(movimentos?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Sem movimentos registados
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimentos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">{formatDate(m.data)}</TableCell>
                        <TableCell>
                          <Badge className={m.tipo === 'LEVANTAMENTO'
                            ? 'bg-amber-100 text-amber-700 border-0'
                            : 'bg-blue-100 text-blue-700 border-0'
                          }>
                            <span className="flex items-center gap-1">
                              {m.tipo === 'LEVANTAMENTO'
                                ? <><ArrowDownToLine className="h-3 w-3" /> Levantamento</>
                                : <><ArrowUpFromLine className="h-3 w-3" /> Depósito</>
                              }
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{m.descricao ?? '-'}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{formatCurrency(m.valor)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.observacoes ?? '-'}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(m)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openDelete(m)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* -------- CREATE DIALOG -------- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Movimento</DialogTitle>
            <DialogDescription>
              Registe um levantamento (banco → numerário) ou depósito (numerário → banco).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={createForm.tipo} onValueChange={(v: string) => setCreateForm(p => ({ ...p, tipo: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEVANTAMENTO">
                    <span className="flex items-center gap-2"><ArrowDownToLine className="h-4 w-4" /> Levantamento (banco → numerário)</span>
                  </SelectItem>
                  <SelectItem value="DEPOSITO">
                    <span className="flex items-center gap-2"><ArrowUpFromLine className="h-4 w-4" /> Depósito (numerário → banco)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (€) *</Label>
              <Input type="number" step="0.01" min="0.01" value={createForm.valor} onChange={(e: any) => setCreateForm(p => ({ ...p, valor: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={createForm.data} onChange={(e: any) => setCreateForm(p => ({ ...p, data: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={createForm.descricao} onChange={(e: any) => setCreateForm(p => ({ ...p, descricao: e?.target?.value ?? '' }))} placeholder="Ex: Levantamento para pequenas despesas" />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={createForm.observacoes} onChange={(e: any) => setCreateForm(p => ({ ...p, observacoes: e?.target?.value ?? '' }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSaving}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createSaving}>
              {createSaving ? 'A registar...' : 'Registar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------- EDIT DIALOG -------- */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingMov(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Movimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={editForm.tipo} onValueChange={(v: string) => setEditForm(p => ({ ...p, tipo: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEVANTAMENTO">
                    <span className="flex items-center gap-2"><ArrowDownToLine className="h-4 w-4" /> Levantamento</span>
                  </SelectItem>
                  <SelectItem value="DEPOSITO">
                    <span className="flex items-center gap-2"><ArrowUpFromLine className="h-4 w-4" /> Depósito</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (€) *</Label>
              <Input type="number" step="0.01" min="0.01" value={editForm.valor} onChange={(e: any) => setEditForm(p => ({ ...p, valor: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={editForm.data} onChange={(e: any) => setEditForm(p => ({ ...p, data: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={editForm.descricao} onChange={(e: any) => setEditForm(p => ({ ...p, descricao: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={editForm.observacoes} onChange={(e: any) => setEditForm(p => ({ ...p, observacoes: e?.target?.value ?? '' }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editSaving}>
              {editSaving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------- DELETE DIALOG -------- */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar movimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O {deletingMov?.tipo === 'LEVANTAMENTO' ? 'levantamento' : 'depósito'} de{' '}
              <strong>{formatCurrency(deletingMov?.valor)}</strong> será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deleteSaving ? 'A eliminar...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
