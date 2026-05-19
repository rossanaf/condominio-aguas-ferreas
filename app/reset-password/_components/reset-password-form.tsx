'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Lock,
  KeyRound,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { toast } from 'sonner';

type ValidationState =
  | { status: 'loading' }
  | { status: 'valid'; email: string }
  | { status: 'invalid'; error: string };

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? '';

  const [validation, setValidation] = useState<ValidationState>({
    status: 'loading',
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidation({ status: 'invalid', error: 'Token em falta' });
      return;
    }

    const validate = async () => {
      try {
        const res = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (data?.valid) {
          setValidation({ status: 'valid', email: data.email });
        } else {
          setValidation({
            status: 'invalid',
            error: data?.error ?? 'Token inválido',
          });
        }
      } catch (error) {
        console.error('Validate token error:', error);
        setValidation({
          status: 'invalid',
          error: 'Erro ao validar o link',
        });
      }
    };

    validate();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A password deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As passwords não coincidem');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erro ao atualizar a password');
        return;
      }

      setSuccess(true);
      toast.success('Password atualizada com sucesso!');
      setTimeout(() => {
        router.replace('/login');
      }, 2500);
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Erro ao atualizar a password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 hero-gradient">
      <Card className="w-full max-w-md" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl tracking-tight">
            Nova Password
          </CardTitle>
          <CardDescription>
            {validation.status === 'valid' && !success
              ? `Defina a nova password para ${validation.email}`
              : 'Recuperação de Password'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {validation.status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <span className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              <p className="text-sm text-muted-foreground">
                A validar o link...
              </p>
            </div>
          )}

          {validation.status === 'invalid' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center gap-3 p-6 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm font-medium text-foreground">
                  {validation.error}
                </p>
                <p className="text-xs text-muted-foreground">
                  Solicite um novo link de recuperação para continuar.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/forgot-password">
                  <KeyRound className="h-4 w-4 mr-2" />
                  Solicitar Novo Link
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Login
                </Link>
              </Button>
            </div>
          )}

          {validation.status === 'valid' && success && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center gap-3 p-6 rounded-lg bg-primary/5 border border-primary/10">
                <CheckCircle2 className="h-12 w-12 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Password atualizada com sucesso!
                </p>
                <p className="text-xs text-muted-foreground">
                  A redirecionar para a página de login...
                </p>
              </div>
            </div>
          )}

          {validation.status === 'valid' && !success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e: any) => setPassword(e?.target?.value ?? '')}
                    className="pl-10 pr-10"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repita a nova password"
                    value={confirmPassword}
                    onChange={(e: any) =>
                      setConfirmPassword(e?.target?.value ?? '')
                    }
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                    A atualizar...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Definir Nova Password
                  </span>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
