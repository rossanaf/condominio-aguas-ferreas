'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FadeIn } from '@/components/ui/animate';
import {
  UserPlus,
  MoreVertical,
  Pencil,
  KeyRound,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Phone,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

type FracaoOption = {
  id: string;
  letra: string;
  user?: { id: string } | null;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'CONDOMINO';
  fracaoId: string | null;
  fracao?: { letra: string } | null;
  telefone?: string | null;
  morada?: string | null;
  lastLoginAt?: string | null;
  mustChangePassword?: boolean;
};

const NO_FRACTION = '__none__';

function formatLastLogin(iso: string | null | undefined): {
  text: string;
  hint?: string;
  neverAccessed: boolean;
} {
  if (!iso) return { text: 'Nunca acedeu', neverAccessed: true };
  try {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = d.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return { text: `${dateStr} ${timeStr}`, neverAccessed: false };
  } catch {
    return { text: 'Nunca acedeu', neverAccessed: true };
  }
}

export function UtilizadoresClient() {
  const { data: session } = useSession() || {};
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [fracoes, setFracoes] = useState<FracaoOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'CONDOMINO',
    fracaoId: '',
    telefone: '',
    morada: '',
  });
  const [showCreatePwd, setShowCreatePwd] = useState(false);
  const [createSendEmail, setCreateSendEmail] = useState(true);
  const [createForceChange, setCreateForceChange] = useState(true);
  const [createSaving, setCreateSaving] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    email: '',
    name: '',
    role: 'CONDOMINO' as 'ADMIN' | 'CONDOMINO',
    fracaoId: '',
    telefone: '',
    morada: '',
  });
  const [editSaving, setEditSaving] = useState(false);

  // Reset password dialog
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [resetPwd, setResetPwd] = useState('');
  const [resetPwdConfirm, setResetPwdConfirm] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetSendEmail, setResetSendEmail] = useState(true);
  const [resetForceChange, setResetForceChange] = useState(true);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/utilizadores').then((r) => r?.json?.()),
      fetch('/api/fracoes').then((r) => r?.json?.()),
    ])
      .then(([u, f]: any) => {
        setUsers(u ?? []);
        setFracoes(f ?? []);
      })
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // ---------- CREATE ----------
  const handleCreate = async () => {
    if (!createForm.email || !createForm.name || !createForm.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (createForm.password.length < 6) {
      toast.error('A password deve ter pelo menos 6 caracteres');
      return;
    }
    setCreateSaving(true);
    try {
      const res = await fetch('/api/utilizadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          sendWelcomeEmail: createSendEmail,
          mustChangePassword: createForceChange,
        }),
      });
      if (res?.ok) {
        const created = await res.json();
        if (createSendEmail) {
          if (created?.emailStatus?.sent) {
            toast.success(
              `Utilizador criado e email enviado para ${createForm.email}`
            );
          } else {
            toast.warning(
              `Utilizador criado, mas falhou o envio do email: ${
                created?.emailStatus?.error ?? 'erro desconhecido'
              }`
            );
          }
        } else {
          toast.success('Utilizador criado com sucesso');
        }
        setCreateOpen(false);
        setCreateForm({
          email: '',
          name: '',
          password: '',
          role: 'CONDOMINO',
          fracaoId: '',
          telefone: '',
          morada: '',
        });
        setShowCreatePwd(false);
        setCreateSendEmail(true);
        setCreateForceChange(true);
        loadData();
      } else {
        const err = await res?.json?.();
        toast.error(err?.error ?? 'Erro ao criar utilizador');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao criar utilizador');
    } finally {
      setCreateSaving(false);
    }
  };

  // ---------- EDIT ----------
  const openEdit = (user: UserRow) => {
    setEditingUser(user);
    setEditForm({
      email: user.email ?? '',
      name: user.name ?? '',
      role: user.role,
      fracaoId: user.fracaoId ?? '',
      telefone: user.telefone ?? '',
      morada: user.morada ?? '',
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    if (!editForm.email || !editForm.name) {
      toast.error('Nome e email são obrigatórios');
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/utilizadores/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editForm.email,
          name: editForm.name,
          role: editForm.role,
          fracaoId:
            editForm.role === 'CONDOMINO' && editForm.fracaoId
              ? editForm.fracaoId
              : null,
          telefone: editForm.telefone || null,
          morada: editForm.morada || null,
        }),
      });
      if (res?.ok) {
        toast.success('Utilizador atualizado');
        setEditOpen(false);
        setEditingUser(null);
        loadData();
      } else {
        const err = await res?.json?.();
        toast.error(err?.error ?? 'Erro ao atualizar utilizador');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao atualizar utilizador');
    } finally {
      setEditSaving(false);
    }
  };

  // ---------- RESET PASSWORD ----------
  const openReset = (user: UserRow) => {
    setResetUser(user);
    setResetPwd('');
    setResetPwdConfirm('');
    setShowResetPwd(false);
    setResetSendEmail(true);
    setResetForceChange(true);
    setResetOpen(true);
  };

  const handleReset = async () => {
    if (!resetUser) return;
    if (resetPwd.length < 6) {
      toast.error('A password deve ter pelo menos 6 caracteres');
      return;
    }
    if (resetPwd !== resetPwdConfirm) {
      toast.error('As passwords não coincidem');
      return;
    }
    setResetSaving(true);
    try {
      const res = await fetch(
        `/api/utilizadores/${resetUser.id}/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: resetPwd,
            sendEmail: resetSendEmail,
            forceChange: resetForceChange,
          }),
        }
      );
      if (res?.ok) {
        const data = await res.json();
        if (resetSendEmail) {
          if (data?.emailStatus?.sent) {
            toast.success(
              `Password atualizada e email enviado para ${resetUser.email}`
            );
          } else {
            toast.warning(
              `Password atualizada, mas falhou o envio do email: ${
                data?.emailStatus?.error ?? 'erro desconhecido'
              }`
            );
          }
        } else {
          toast.success(data?.message ?? 'Password atualizada');
        }
        setResetOpen(false);
        setResetUser(null);
        setResetPwd('');
        setResetPwdConfirm('');
        loadData();
      } else {
        const err = await res?.json?.();
        toast.error(err?.error ?? 'Erro ao atualizar password');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao atualizar password');
    } finally {
      setResetSaving(false);
    }
  };

  // ---------- DELETE ----------
  const openDelete = (user: UserRow) => {
    setDeleteUser(user);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/utilizadores/${deleteUser.id}`, {
        method: 'DELETE',
      });
      if (res?.ok) {
        toast.success('Utilizador apagado');
        setDeleteOpen(false);
        setDeleteUser(null);
        loadData();
      } else {
        const err = await res?.json?.();
        toast.error(err?.error ?? 'Erro ao apagar utilizador');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao apagar utilizador');
    } finally {
      setDeleteSaving(false);
    }
  };

  // Helper: which fractions are selectable for edit (free + current user's)
  const getSelectableFracoes = (ownerId?: string): FracaoOption[] => {
    return (fracoes ?? []).filter(
      (f) => !f.user || f.user.id === ownerId
    );
  };

  // Helper: generate a random secure password to suggest
  const generateRandomPassword = (length = 10) => {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < length; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd;
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-tight font-bold">
              Utilizadores
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gestão de acessos ao sistema
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Novo Utilizador
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fração</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead className="w-[60px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        A carregar...
                      </TableCell>
                    </TableRow>
                  ) : (users?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Sem utilizadores
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => {
                      const isSelf = u.id === currentUserId;
                      const last = formatLastLogin(u.lastLoginAt ?? null);
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span>{u.name ?? ''}</span>
                              {isSelf && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  Você
                                </Badge>
                              )}
                              {u.mustChangePassword && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-amber-300 text-amber-700 bg-amber-50"
                                  title="Tem de alterar a password no próximo acesso"
                                >
                                  Password temporária
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.email}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                u.role === 'ADMIN' ? 'default' : 'outline'
                              }
                              className="text-xs"
                            >
                              {u.role === 'ADMIN' ? 'Administrador' : 'Condómino'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {u.fracao?.letra ? `Fração ${u.fracao.letra}` : '-'}
                          </TableCell>
                          <TableCell>
                            {last.neverAccessed ? (
                              <Badge
                                variant="outline"
                                className="text-[11px] border-slate-300 text-slate-600 bg-slate-50"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Nunca acedeu
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {last.text}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Ações</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(u)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openReset(u)}>
                                  <KeyRound className="h-4 w-4 mr-2" />
                                  Repor password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDelete(u)}
                                  disabled={isSelf}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Apagar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* -------- CREATE DIALOG -------- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Utilizador</DialogTitle>
            <DialogDescription>
              Crie uma conta de acesso ao sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={createForm.name}
                onChange={(e: any) =>
                  setCreateForm((p) => ({
                    ...p,
                    name: e?.target?.value ?? '',
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e: any) =>
                  setCreateForm((p) => ({
                    ...p,
                    email: e?.target?.value ?? '',
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Password inicial *</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() =>
                    setCreateForm((p) => ({
                      ...p,
                      password: generateRandomPassword(10),
                    }))
                  }
                >
                  Gerar aleatória
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showCreatePwd ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={createForm.password}
                  onChange={(e: any) =>
                    setCreateForm((p) => ({
                      ...p,
                      password: e?.target?.value ?? '',
                    }))
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCreatePwd ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={createForm.role}
                onValueChange={(v: string) =>
                  setCreateForm((p) => ({
                    ...p,
                    role: v,
                    fracaoId: v === 'ADMIN' ? '' : p.fracaoId,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONDOMINO">Condómino</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createForm.role === 'CONDOMINO' && (
              <div className="space-y-2">
                <Label>Fração</Label>
                <Select
                  value={createForm.fracaoId || NO_FRACTION}
                  onValueChange={(v: string) =>
                    setCreateForm((p) => ({
                      ...p,
                      fracaoId: v === NO_FRACTION ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar fração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_FRACTION}>Sem fração</SelectItem>
                    {getSelectableFracoes().map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        Fração {f.letra}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefone</Label>
              <Input
                type="tel"
                placeholder="Ex: 912 345 678"
                value={createForm.telefone}
                onChange={(e: any) =>
                  setCreateForm((p) => ({
                    ...p,
                    telefone: e?.target?.value ?? '',
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Morada</Label>
              <Input
                placeholder="Ex: Rua das Flores, 10, Porto"
                value={createForm.morada}
                onChange={(e: any) =>
                  setCreateForm((p) => ({
                    ...p,
                    morada: e?.target?.value ?? '',
                  }))
                }
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="create-send-email"
                  checked={createSendEmail}
                  onCheckedChange={(v: any) => setCreateSendEmail(!!v)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="create-send-email"
                    className="text-sm cursor-pointer"
                  >
                    Enviar email com as credenciais de acesso
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    O utilizador recebe um email com o link da plataforma,
                    email e password iniciais.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="create-force-change"
                  checked={createForceChange}
                  onCheckedChange={(v: any) => setCreateForceChange(!!v)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="create-force-change"
                    className="text-sm cursor-pointer"
                  >
                    Obrigar a alterar a password no primeiro acesso
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    O utilizador terá de definir uma nova password antes de
                    poder usar a plataforma.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createSaving}>
              <UserPlus className="h-4 w-4 mr-1" />
              {createSaving ? 'A criar...' : 'Criar Utilizador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------- EDIT DIALOG -------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Utilizador</DialogTitle>
            <DialogDescription>
              Atualizar dados de {editingUser?.name ?? editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={editForm.name}
                onChange={(e: any) =>
                  setEditForm((p) => ({
                    ...p,
                    name: e?.target?.value ?? '',
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e: any) =>
                  setEditForm((p) => ({
                    ...p,
                    email: e?.target?.value ?? '',
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={editForm.role}
                onValueChange={(v: string) =>
                  setEditForm((p) => ({
                    ...p,
                    role: v as 'ADMIN' | 'CONDOMINO',
                    fracaoId: v === 'ADMIN' ? '' : p.fracaoId,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONDOMINO">Condómino</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.role === 'CONDOMINO' && (
              <div className="space-y-2">
                <Label>Fração</Label>
                <Select
                  value={editForm.fracaoId || NO_FRACTION}
                  onValueChange={(v: string) =>
                    setEditForm((p) => ({
                      ...p,
                      fracaoId: v === NO_FRACTION ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar fração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_FRACTION}>Sem fração</SelectItem>
                    {getSelectableFracoes(editingUser?.id).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        Fração {f.letra}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefone</Label>
              <Input
                type="tel"
                placeholder="Ex: 912 345 678"
                value={editForm.telefone}
                onChange={(e: any) =>
                  setEditForm((p) => ({
                    ...p,
                    telefone: e?.target?.value ?? '',
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Morada</Label>
              <Input
                placeholder="Ex: Rua das Flores, 10, Porto"
                value={editForm.morada}
                onChange={(e: any) =>
                  setEditForm((p) => ({
                    ...p,
                    morada: e?.target?.value ?? '',
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={editSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={editSaving}>
              {editSaving ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------- RESET PASSWORD DIALOG -------- */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Repor Password</DialogTitle>
            <DialogDescription>
              Definir nova password para{' '}
              <strong>{resetUser?.name ?? resetUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Nova Password *</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    const p = generateRandomPassword(10);
                    setResetPwd(p);
                    setResetPwdConfirm(p);
                    setShowResetPwd(true);
                  }}
                >
                  Gerar aleatória
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showResetPwd ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={resetPwd}
                  onChange={(e: any) => setResetPwd(e?.target?.value ?? '')}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowResetPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showResetPwd ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirmar Password *</Label>
              <Input
                type={showResetPwd ? 'text' : 'password'}
                placeholder="Repita a password"
                value={resetPwdConfirm}
                onChange={(e: any) =>
                  setResetPwdConfirm(e?.target?.value ?? '')
                }
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="reset-send-email"
                  checked={resetSendEmail}
                  onCheckedChange={(v: any) => setResetSendEmail(!!v)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="reset-send-email"
                    className="text-sm cursor-pointer"
                  >
                    Enviar email com a nova password
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    O utilizador recebe um email com as novas credenciais.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="reset-force-change"
                  checked={resetForceChange}
                  onCheckedChange={(v: any) => setResetForceChange(!!v)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="reset-force-change"
                    className="text-sm cursor-pointer"
                  >
                    Obrigar a alterar a password no próximo acesso
                  </Label>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Esta ação invalida quaisquer links de recuperação pendentes
              para este utilizador.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetOpen(false)}
              disabled={resetSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleReset} disabled={resetSaving}>
              <KeyRound className="h-4 w-4 mr-1" />
              {resetSaving ? 'A guardar...' : 'Atualizar Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------- DELETE CONFIRMATION -------- */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar utilizador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. A conta de{' '}
              <strong>{deleteUser?.name ?? deleteUser?.email}</strong> será
              permanentemente removida do sistema, bem como quaisquer pedidos
              de recuperação de password associados.
              {deleteUser?.fracao?.letra && (
                <span className="block mt-2 text-sm">
                  A Fração {deleteUser.fracao.letra} ficará sem utilizador
                  associado (a fração em si mantém-se).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deleteSaving ? 'A apagar...' : 'Apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
