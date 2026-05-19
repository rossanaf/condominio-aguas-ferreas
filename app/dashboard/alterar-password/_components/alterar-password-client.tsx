'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FadeIn } from '@/components/ui/animate';
import { Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export function AlterarPasswordClient() {
  const router = useRouter();
  const { data: session, update } = useSession() || {};
  const mustChange = (session?.user as any)?.mustChangePassword === true;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data?.error ?? 'Erro ao alterar password');
        return;
      }

      toast.success('Password alterada com sucesso!');

      // Refresh JWT so guard no longer forces the redirect
      if (typeof update === 'function') {
        await update({ mustChangePassword: false });
      }

      router.replace('/dashboard');
    } catch (error) {
      console.error('Change password error:', error);
      toast.error('Erro ao alterar password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <FadeIn>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-primary" />
              Alterar Password
            </CardTitle>
            <CardDescription>
              {mustChange
                ? 'Defina uma nova password antes de continuar.'
                : 'Atualize a sua password de acesso.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mustChange && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Alteração obrigatória</p>
                  <p className="text-xs mt-0.5">
                    A password atual foi definida pelo administrador. Por
                    segurança, deve definir uma password pessoal antes de
                    aceder ao resto do sistema.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  {mustChange ? 'Password recebida' : 'Password Atual'}
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e: any) =>
                      setCurrentPassword(e?.target?.value ?? '')
                    }
                    placeholder={
                      mustChange
                        ? 'A password que recebeu por email'
                        : 'Password atual'
                    }
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Mostrar/ocultar"
                  >
                    {showCurrent ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
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
                    onChange={(e: any) =>
                      setNewPassword(e?.target?.value ?? '')
                    }
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Mostrar/ocultar"
                  >
                    {showNew ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
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
                    onChange={(e: any) =>
                      setConfirmPassword(e?.target?.value ?? '')
                    }
                    placeholder="Repita a nova password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Mostrar/ocultar"
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
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
  );
}
