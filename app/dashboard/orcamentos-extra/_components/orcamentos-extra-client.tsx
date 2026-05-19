'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/animate';
import { Plus, Hammer, ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

function formatCurrency(val: number | null | undefined): string {
  return (val ?? 0)?.toLocaleString?.('pt-PT', { style: 'currency', currency: 'EUR' }) ?? '0,00 €';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try { return new Date(dateStr)?.toLocaleDateString?.('pt-PT') ?? '-'; } catch { return '-'; }
}

export function OrcamentosExtraClient() {
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payingCota, setPayingCota] = useState<any>(null);
  const [ano, setAno] = useState('');

  const [formData, setFormData] = useState({
    descricao: '', valorTotal: '', percentagemFR: '0', observacoes: '',
  });

  useEffect(() => {
    setAno(String(new Date().getFullYear()));
  }, []);

  const loadData = () => {
    if (!ano) return;
    setLoading(true);
    fetch(`/api/orcamentos-extraordinarios?ano=${ano}`)
      .then(r => r?.json?.())
      .then(d => setOrcamentos(d ?? []))
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [ano]);

  const handleCreate = async () => {
    if (!formData?.descricao || !formData?.valorTotal) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    try {
      const res = await fetch('/api/orcamentos-extraordinarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, ano: Number(ano) }),
      });
      if (res?.ok) {
        toast.success('Orçamento extraordinário criado com sucesso');
        setDialogOpen(false);
        setFormData({ descricao: '', valorTotal: '', percentagemFR: '0', observacoes: '' });
        loadData();
      } else {
        const err = await res?.json?.();
        toast.error(err?.error ?? 'Erro ao criar orçamento');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao criar orçamento');
    }
  };

  const handleMarkPaid = async () => {
    if (!payingCota) return;
    try {
      const payRes = await fetch('/api/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fracaoId: payingCota.fracaoId,
          cotaExtraId: payingCota.id,
          valor: String(payingCota.valorTotal),
          dataPagamento: new Date().toISOString().split('T')[0],
          metodoPagamento: 'Transferência',
          observacoes: 'Pagamento orçamento extraordinário',
        }),
      });

      if (!payRes?.ok) {
        toast.error('Erro ao registar pagamento');
        return;
      }

      const res = await fetch('/api/orcamentos-extraordinarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotaExtraId: payingCota.id,
          pago: true,
          dataPagamento: new Date().toISOString(),
        }),
      });
      if (res?.ok) {
        toast.success('Pagamento registado com sucesso');
        setPayDialogOpen(false);
        setPayingCota(null);
        loadData();
      } else {
        toast.error('Erro ao marcar como pago');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao processar pagamento');
    }
  };

  const totalOrcado = (orcamentos ?? []).reduce((acc: number, o: any) => acc + (o?.valorTotal ?? 0), 0);
  const totalPago = (orcamentos ?? []).reduce((acc: number, o: any) => {
    return acc + ((o?.cotas ?? []).filter((c: any) => c?.pago).reduce((a: number, c: any) => a + (c?.valorTotal ?? 0), 0));
  }, 0);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-tight font-bold">Orçamentos Extraordinários</h1>
            <p className="text-muted-foreground text-sm mt-1">Despesas extra orçamento anual distribuídas por permilagem</p>
          </div>
          <div className="flex gap-2">
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
            </Select>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo Orçamento
            </Button>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Orçado</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(totalOrcado)}</p>
          </CardContent>
        </Card>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Pago</p>
            <p className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(totalPago)}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">A carregar...</CardContent></Card>
      ) : (orcamentos?.length ?? 0) === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Sem orçamentos extraordinários para {ano}</CardContent></Card>
      ) : (
        (orcamentos ?? []).map((orc: any) => {
          const isExpanded = expandedId === orc?.id;
          const cotasPagas = (orc?.cotas ?? []).filter((c: any) => c?.pago).length;
          const totalCotas = (orc?.cotas ?? []).length;

          return (
            <FadeIn key={orc?.id ?? Math.random()} delay={0.05}>
              <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Hammer className="h-5 w-5 text-amber-700" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{orc?.descricao ?? ''}</CardTitle>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{formatCurrency(orc?.valorTotal)}</Badge>
                          <Badge variant="outline" className="text-xs">FR: {orc?.percentagemFR ?? 0}%</Badge>
                          <Badge className={cotasPagas === totalCotas ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' : 'bg-amber-100 text-amber-700 border-0 text-xs'}>
                            {cotasPagas}/{totalCotas} pagas
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : orc?.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    {orc?.observacoes && <p className="text-sm text-muted-foreground mb-3">{orc.observacoes}</p>}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fração</TableHead>
                            <TableHead>Proprietário</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead className="text-right">CC</TableHead>
                            <TableHead className="text-right">FR</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead className="text-center">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(orc?.cotas ?? []).map((c: any) => (
                            <TableRow key={c?.id ?? Math.random()}>
                              <TableCell className="font-medium">Fração {c?.fracao?.letra ?? '?'}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{c?.fracao?.proprietario ?? '-'}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">{formatCurrency(c?.valorTotal)}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatCurrency(c?.valorCC)}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatCurrency(c?.valorFR)}</TableCell>
                              <TableCell className="text-center">
                                {c?.pago ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-0">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Pago
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-700 border-0">
                                    <Clock className="h-3 w-3 mr-1" /> Pendente
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {!c?.pago && (
                                  <Button variant="outline" size="sm" onClick={() => { setPayingCota(c); setPayDialogOpen(true); }}>
                                    Pagar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            </FadeIn>
          );
        })
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Orçamento Extraordinário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={formData?.descricao ?? ''} onChange={(e: any) => setFormData(prev => ({ ...(prev ?? {}), descricao: e?.target?.value ?? '' }))} placeholder="Ex: Reparação do telhado" />
            </div>
            <div className="space-y-2">
              <Label>Valor Total (€) *</Label>
              <Input type="number" step="0.01" value={formData?.valorTotal ?? ''} onChange={(e: any) => setFormData(prev => ({ ...(prev ?? {}), valorTotal: e?.target?.value ?? '' }))} />
            </div>
            <div className="space-y-2">
              <Label>% Fundo de Reserva</Label>
              <Input type="number" step="0.01" min="0" max="100" value={formData?.percentagemFR ?? '0'} onChange={(e: any) => setFormData(prev => ({ ...(prev ?? {}), percentagemFR: e?.target?.value ?? '0' }))} />
              <p className="text-xs text-muted-foreground">0% para despesas sem contribuição para FR (ex: reparações)</p>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={formData?.observacoes ?? ''} onChange={(e: any) => setFormData(prev => ({ ...(prev ?? {}), observacoes: e?.target?.value ?? '' }))} />
            </div>
            <Button onClick={handleCreate} className="w-full">
              <Hammer className="h-4 w-4 mr-1" /> Criar e Gerar Cotas
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registar Pagamento</DialogTitle>
          </DialogHeader>
          {payingCota && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm"><strong>Fração:</strong> {payingCota?.fracao?.letra ?? '?'}</p>
                <p className="text-sm"><strong>Proprietário:</strong> {payingCota?.fracao?.proprietario ?? '-'}</p>
                <p className="text-sm"><strong>Valor:</strong> {formatCurrency(payingCota?.valorTotal)}</p>
                <p className="text-xs text-muted-foreground">CC: {formatCurrency(payingCota?.valorCC)} | FR: {formatCurrency(payingCota?.valorFR)}</p>
              </div>
              <Button onClick={handleMarkPaid} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar Pagamento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}