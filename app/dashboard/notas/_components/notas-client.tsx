'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { StickyNote, Plus, Pencil, Trash2, Calendar, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAX_LEN = 256;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return '-';
  }
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function NotasClient() {
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<{ data: string; texto: string }>({
    data: new Date().toISOString().slice(0, 10),
    texto: '',
  });
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/notas')
      .then((r) => (r?.ok ? r.json() : []))
      .then((data: any) => setNotas(Array.isArray(data) ? data : []))
      .catch((err: any) => {
        console.error('Fetch notas error:', err);
        setNotas([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddDialog = () => {
    setEditing(null);
    setForm({ data: new Date().toISOString().slice(0, 10), texto: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (nota: any) => {
    setEditing(nota);
    setForm({
      data: toDateInputValue(nota?.data),
      texto: nota?.texto ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const texto = (form?.texto ?? '').trim();
    if (!form?.data) {
      toast.error('A data é obrigatória');
      return;
    }
    if (!texto) {
      toast.error('O texto é obrigatório');
      return;
    }
    if (texto.length > MAX_LEN) {
      toast.error(`O texto não pode ter mais de ${MAX_LEN} caracteres`);
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editing?.id;
      const url = isEdit ? `/api/notas/${editing.id}` : '/api/notas';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: form.data, texto }),
      });
      if (res?.ok) {
        toast.success(isEdit ? 'Nota actualizada' : 'Nota adicionada');
        setDialogOpen(false);
        setEditing(null);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? 'Erro ao guardar nota');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao guardar nota');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const id = deletingId;
    if (!id) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/notas/${id}`, { method: 'DELETE' });
      if (res?.ok) {
        toast.success('Nota eliminada');
        setDeletingId(null);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? 'Erro ao eliminar nota');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao eliminar nota');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const charsLeft = MAX_LEN - (form?.texto ?? '').length;

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl tracking-tight font-bold flex items-center gap-2">
              <StickyNote className="h-6 w-6 text-primary" />
              Notas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Registo simples de anotações pessoais do administrador
            </p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1" /> Nova Nota
          </Button>
        </div>
      </FadeIn>

      {(notas ?? []).length === 0 ? (
        <FadeIn delay={0.1}>
          <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-10 text-center">
              <StickyNote className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Ainda não tem notas registadas.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-1" /> Criar primeira nota
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(notas ?? []).map((n: any, idx: number) => (
            <SlideIn key={n?.id ?? idx} from="bottom" delay={Math.min(idx, 5) * 0.05}>
              <Card style={{ boxShadow: 'var(--shadow-sm)' }} className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>{formatDate(n?.data)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Editar"
                        onClick={() => openEditDialog(n)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        title="Eliminar"
                        onClick={() => setDeletingId(n?.id ?? '')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {n?.texto ?? ''}
                  </p>
                </CardContent>
              </Card>
            </SlideIn>
          ))}
        </div>
      )}

      {/* Add/edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDialogOpen(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Nota' : 'Nova Nota'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Actualize a data ou o texto da nota'
                : 'Adicione uma nota com uma data de referência'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={form?.data ?? ''}
                onChange={(e: any) => setForm((prev) => ({ ...prev, data: e?.target?.value ?? '' }))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Texto *</Label>
                <span className={`text-xs ${charsLeft < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {charsLeft} caracteres restantes
                </span>
              </div>
              <Textarea
                value={form?.texto ?? ''}
                onChange={(e: any) =>
                  setForm((prev) => ({ ...prev, texto: (e?.target?.value ?? '').slice(0, MAX_LEN) }))
                }
                placeholder="Escreva a sua nota aqui..."
                rows={5}
                maxLength={MAX_LEN}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditing(null);
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> A guardar...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" /> Guardar
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open: boolean) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acção não pode ser revertida. A nota será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: any) => {
                e?.preventDefault?.();
                handleDelete();
              }}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> A eliminar...
                </span>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
