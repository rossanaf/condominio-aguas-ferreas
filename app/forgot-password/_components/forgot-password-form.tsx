'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Mail, Send, ArrowLeft, CheckCircle2 } from 'lucide-react';
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

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erro ao processar o pedido');
        return;
      }

      setSubmitted(true);
      toast.success('Pedido enviado com sucesso');
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('Erro ao processar o pedido');
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
            Recuperar Password
          </CardTitle>
          <CardDescription>
            {submitted
              ? 'Verifique o seu email'
              : 'Introduza o email associado à sua conta'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center gap-3 p-6 rounded-lg bg-primary/5 border border-primary/10">
                <CheckCircle2 className="h-12 w-12 text-primary" />
                <p className="text-sm text-foreground">
                  Se o email existir no sistema, receberá em breve um email
                  com instruções para repor a password.
                </p>
                <p className="text-xs text-muted-foreground">
                  O link será válido durante 1 hora. Verifique também a pasta
                  de spam.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Login
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.pt"
                      value={email}
                      onChange={(e: any) => setEmail(e?.target?.value ?? '')}
                      className="pl-10"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      A enviar...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Enviar Link de Recuperação
                    </span>
                  )}
                </Button>
              </form>
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Voltar ao Login
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
