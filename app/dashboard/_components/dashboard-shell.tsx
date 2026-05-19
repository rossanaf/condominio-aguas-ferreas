'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Building2, LayoutDashboard, Home, CreditCard,
  Receipt, FileText, PieChart, BarChart3,
  LogOut, Menu, X, Users, Landmark, Hammer, UserCog, FileWarning, StickyNote, AlertTriangle, Wallet
} from 'lucide-react';

const adminLinks = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/dashboard/fracoes', label: 'Frações', icon: Home },
  { href: '/dashboard/cotas', label: 'Cotas', icon: CreditCard },
  { href: '/dashboard/pagamentos', label: 'Pagamentos', icon: Receipt },
  { href: '/dashboard/despesas', label: 'Despesas', icon: FileText },
  { href: '/dashboard/orcamento', label: 'Orçamento', icon: PieChart },
  { href: '/dashboard/orcamentos-extra', label: 'Orç. Extraordinários', icon: Hammer },
  { href: '/dashboard/conta-corrente', label: 'Conta Corrente', icon: Wallet },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/dashboard/transitados', label: 'Transitados', icon: Landmark },
  { href: '/dashboard/notas', label: 'Notas', icon: StickyNote },
  { href: '/dashboard/utilizadores', label: 'Utilizadores', icon: Users },
  { href: '/dashboard/perfil', label: 'O Meu Perfil', icon: UserCog },
];

const condominoBaseLinks = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/dashboard/cotas', label: 'Cotas Ano Corrente', icon: CreditCard },
  { href: '/dashboard/pagamentos', label: 'Os Meus Pagamentos', icon: Receipt },
  { href: '/dashboard/orcamento', label: 'Orçamento', icon: PieChart },
  { href: '/dashboard/perfil', label: 'O Meu Perfil', icon: UserCog },
];

export function DashboardShell({ session, children }: { session: any; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Use live client session so mustChangePassword flag updates after change
  const { data: liveSession } = useSession() || {};
  const mustChangePassword =
    (liveSession?.user as any)?.mustChangePassword === true;

  useEffect(() => {
    if (mustChangePassword && pathname !== '/dashboard/alterar-password') {
      router.replace('/dashboard/alterar-password');
    }
  }, [mustChangePassword, pathname, router]);

  const userRole = session?.user?.role ?? 'CONDOMINO';
  const isAdmin = userRole === 'ADMIN';

  const [outrasDividasCount, setOutrasDividasCount] = useState<number>(0);
  const [cotasAtrasadasCount, setCotasAtrasadasCount] = useState<number>(0);
  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    fetch('/api/outras-dividas')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (cancelled) return;
        const pending = (Array.isArray(data) ? data : []).filter(
          (d: any) => !d?.liquidada
        );
        setOutrasDividasCount(pending.length);
      })
      .catch(() => {});
    fetch('/api/cotas-atrasadas')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: any) => {
        if (cancelled) return;
        setCotasAtrasadasCount(Number(data?.count ?? 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const condominoLinks = (() => {
    const extras: any[] = [];
    if (cotasAtrasadasCount > 0) {
      extras.push({
        href: '/dashboard/cotas-atrasadas',
        label: 'Cotas em Atraso',
        icon: AlertTriangle,
      });
    }
    if (outrasDividasCount > 0) {
      extras.push({
        href: '/dashboard/outras-dividas',
        label: 'Outras Dívidas',
        icon: FileWarning,
      });
    }
    if (extras.length === 0) return condominoBaseLinks;
    // Inserir extras antes de Orçamento e Perfil
    return [
      condominoBaseLinks[0], // Painel
      condominoBaseLinks[1], // Cotas Ano Corrente
      condominoBaseLinks[2], // Os Meus Pagamentos
      ...extras,
      condominoBaseLinks[3], // Orçamento
      condominoBaseLinks[4], // O Meu Perfil
    ];
  })();

  const links = isAdmin ? adminLinks : condominoLinks;

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transition-transform duration-300 ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 p-4 border-b">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-semibold truncate">Águas Férreas</p>
              <p className="text-xs text-muted-foreground truncate">
                {isAdmin ? 'Administrador' : `Fração ${session?.user?.fracaoLetra ?? ''}`}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {links.map((link: any) => {
              const Icon = link?.icon;
              const isActive = pathname === link?.href || (link?.href !== '/dashboard' && pathname?.startsWith?.(link?.href ?? ''));
              return (
                <Link
                  key={link?.href ?? ''}
                  href={link?.href ?? '/dashboard'}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                  <span>{link?.label ?? ''}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t">
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium truncate">{session?.user?.name ?? ''}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email ?? ''}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card/80 backdrop-blur-md px-4 sm:px-6">
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-3 py-2 shadow-md active:scale-95 transition-transform"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
            <span className="text-sm font-semibold">Menu</span>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {session?.user?.name ?? ''}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {(session?.user?.name ?? '?')?.charAt?.(0)?.toUpperCase?.() ?? '?'}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t px-4 py-3 text-xs opacity-60 sm:px-6">
          Condomínio Águas Férreas — v{process.env.NEXT_PUBLIC_APP_VERSION}
        </footer>
      </div>
    </div>
  );
}
