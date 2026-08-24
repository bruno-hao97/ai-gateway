import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AudioLines,
  Home,
  Image,
  LogOut,
  MessageSquare,
  Sparkles,
  Video,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { clearAuth, getCreditsAi, getDisplayName } from '@/lib/authStore';
import { cn, formatCredits } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { refreshMe } from '@/lib/apiClient';

const nav = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/image', label: 'Image', icon: Image },
  { to: '/app/video', label: 'Video', icon: Video },
  { to: '/app/chat', label: 'Chat', icon: MessageSquare },
  { to: '/app/audio', label: 'Audio', icon: AudioLines },
  { to: '/app/wallet', label: 'Wallet', icon: Wallet },
];

export function AppShell() {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(getCreditsAi());

  useEffect(() => {
    void refreshMe()
      .then((me) => setCredits(me.balancesInfo?.credits_ai ?? 0))
      .catch(() => undefined);
  }, []);

  function logout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-dvh bg-[linear-gradient(180deg,oklch(0.98_0.01_270),oklch(0.99_0_0))]">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card/80 p-4 md:flex md:flex-col">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">AI Studio</p>
            <p className="text-xs text-muted">via Gommo Gateway</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <div className="px-2">
            <p className="truncate text-sm font-medium">{getDisplayName()}</p>
            <Badge className="mt-1">{formatCredits(credits)} credits</Badge>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/70 px-4 py-3 backdrop-blur md:px-6">
          <div className="md:hidden">
            <p className="font-semibold">AI Studio</p>
          </div>
          <Badge className="md:ml-auto">{formatCredits(credits)} credits</Badge>
          <div className="flex gap-1 overflow-x-auto md:hidden">
            {nav.slice(0, 5).map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn('whitespace-nowrap rounded-md px-2 py-1 text-xs', isActive && 'bg-accent font-medium')
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet context={{ refreshCredits: () => refreshMe().then((m) => setCredits(m.balancesInfo?.credits_ai ?? 0)) }} />
        </main>
      </div>
    </div>
  );
}

export interface AppOutletContext {
  refreshCredits: () => Promise<void>;
}
