'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/ui/animate';
import { User, Lock, Mail, Building2, KeyRound, Eye, EyeOff, Phone, MapPin, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function PerfilClient() {
  const { data: session } = useSession() || {};
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Contactos
  const [telefone, setTelefone] = useState('');
  const [morada, setMorada] = useState('');
  const [loadingContactos, setLoadingContactos] = useState(false);
  const [savingContactos, setSavingContactos] = useState(false);

  useEffect(() => {
    setLoadingContactos(true);
    fetch('/api/perfil')
      .then((r) => r.json())
      .then((data) => {
        setTelefone(data?.telefone ?? '');
        setMorada(data?.morada ?? '');
      })
      .catch(() => {})
      .finally(() => setLoadingContactos(false));
  }, []);

  const handleSaveContactos = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContactos(true);
    try {
      const res = await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, morada }),
      });
      if (res.ok) {
        toast.success('Contactos atualizados com sucesso!');
      } else {
        const err = await res.json();
        toast.error(err?.error ?? 'Erro ao atualizar contactos');
      }
    } catch {
      toast.error('Erro ao atualizar contactos');
    } finally {
      setSavingContactos(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('A nova password deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As passwords não coincidem');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('A nova password deve ser diferente da atual');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erro ao alterar password');
        return;
      }

      toast.success('Password alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Change password error:', error);
      toast.error('Erro ao alterar password');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const fracaoLetra = (session?.user as any)?.fracaoLetra;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">O Meu Perfil</h1>
          <p className="text-muted-foreground/80 mt-1">Informações da conta e definições de segurança</p>
        </div>
      </FadeIn>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Info Card */}
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Informações da Conta
              </CardTitle>
              <CardDescription>Dados associados ao seu perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-sm">{session?.user?.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium text-sm">{session?.user?.name || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Conta</p>
                  <Badge variant={isAdmin ? 'default' : 'secondary'} className="mt-0.5">
                    {isAdmin ? 'Administrador' : 'Condómino'}
                  </Badge>
                </div>
              </div>
              {fracaoLetra && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fração</p>
                    <p className="font-medium text-sm">Fração {fracaoLetra}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Contactos Card */}
        <FadeIn delay={0.15}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="h-5 w-5 text-primary" />
                Contactos
              </CardTitle>
              <CardDescription>Atualize o seu telefone e morada</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingContactos ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <form onSubmit={handleSaveContactos} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="telefone"
                        type="tel"
                        value={telefone}
                        onChange={(e: any) => setTelefone(e?.target?.value ?? '')}
                        placeholder="Ex: 912 345 678"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="morada">Morada</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <textarea
                        id="morada"
                        value={morada}
                        onChange={(e: any) => setMorada(e?.target?.value ?? '')}
                        placeholder="Ex: Rua das Flores, 123, 4000-001 Porto"
                        rows={3}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={savingContactos}>
                    {savingContactos ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        A guardar...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Guardar Contactos
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Change Password Card */}
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Lock className="h-5 w-5 text-primary" />
                Alterar Password
              </CardTitle>
              <CardDescription className="text-muted-foreground/80">Atualize a sua password de acesso</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Password Atual</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e: any) => setCurrentPassword(e?.target?.value ?? '')}
                      placeholder="Introduza a password atual"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e: any) => setNewPassword(e?.target?.value ?? '')}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e: any) => setConfirmPassword(e?.target?.value ?? '')}
                      placeholder="Repita a nova password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      A alterar...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Alterar Password
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
