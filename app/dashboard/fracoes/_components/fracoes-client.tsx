'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { Home, Edit, User, Hash, Save, Phone, MapPin, Mail } from 'lucide-react';
import { toast } from 'sonner';

export function FracoesClient() {
  const [fracoes, setFracoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFracao, setEditingFracao] = useState<any>(null);
  const [proprietario, setProprietario] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch('/api/fracoes')
      .then(r => r?.json?.())
      .then(d => setFracoes(d ?? []))
      .catch((err: any) => console.error('Fracoes fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleEdit = (fracao: any) => {
    setEditingFracao(fracao);
    setProprietario(fracao?.proprietario ?? '');
    setDescricao(fracao?.descricao ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingFracao?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/fracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingFracao.id, proprietario, descricao }),
      });
      if (res?.ok) {
        toast.success('Fração atualizada com sucesso');
        setFracoes((prev: any[]) => (prev ?? []).map((f: any) => f?.id === editingFracao?.id ? { ...f, proprietario, descricao } : f));
        setDialogOpen(false);
      } else {
        toast.error('Erro ao atualizar fração');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1,2,3,4,5,6].map((i: number) => <Card key={i}><CardContent className="p-6"><div className="h-24 animate-pulse bg-muted rounded" /></CardContent></Card>)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl tracking-tight font-bold">Frações</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestão das 12 frações do condomínio</p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(fracoes ?? []).map((f: any, i: number) => (
          <SlideIn key={f?.id ?? i} from="bottom" delay={i * 0.05}>
            <Card className="hover:shadow-md transition-shadow" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <span className="text-lg font-bold text-primary font-mono">{f?.letra ?? '?'}</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    <Hash className="h-3 w-3 mr-1" />
                    {f?.permilagem ?? 0}‰
                  </Badge>
                </div>
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{f?.proprietario ?? 'Sem proprietário'}</span>
                  </div>
                  {f?.descricao && <p className="text-xs text-muted-foreground">{f.descricao}</p>}
                  {f?.user && (
                    <div className="space-y-1 mt-1 pt-1 border-t border-dashed">
                      <p className="text-xs text-primary font-medium">{f.user.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{f.user.email}</span>
                      </div>
                      {f.user.telefone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{f.user.telefone}</span>
                        </div>
                      )}
                      {f.user.morada && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="line-clamp-2">{f.user.morada}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => handleEdit(f)}>
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Button>
              </CardContent>
            </Card>
          </SlideIn>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Fração {editingFracao?.letra ?? ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Proprietário</Label>
              <Input value={proprietario} onChange={(e: any) => setProprietario(e?.target?.value ?? '')} placeholder="Nome do proprietário" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={descricao} onChange={(e: any) => setDescricao(e?.target?.value ?? '')} placeholder="Ex: T2, R/C Esquerdo" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
