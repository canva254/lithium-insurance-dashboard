"use client";

import { Bell, Menu, Sparkles } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import { memo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { CommandPalette } from '@/components/shell/command-palette';
import { ThemeToggle } from '@/components/shell/theme-toggle';

type TopbarProps = {
  user?: { name?: string | null; role?: string | null; avatarUrl?: string | null };
  onToggleSidebar?: () => void;
  onToggleTheme?: () => void;
};

export const Topbar = memo(function Topbar({ user, onToggleSidebar, onToggleTheme }: TopbarProps) {
  const [notifications] = useState(() => [{ id: 'welcome', title: 'New insight', body: 'Revenue up 14% versus last month.' }]);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-gradient-to-r from-background/95 via-background/80 to-background/60 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full border border-border/60 bg-background/70 text-muted-foreground hover:border-primary/50 hover:text-primary md:hidden"
          aria-label="Toggle navigation"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Curated insights optimised for multi-tenant ops</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <CommandPalette onToggleTheme={onToggleTheme} />

        <ThemeToggle />

        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative h-9 w-9 rounded-full border border-border/60 bg-background/70 text-muted-foreground hover:border-primary/50 hover:text-primary"
        >
          <Bell className="h-[18px] w-[18px]" />
          {notifications.length ? (
            <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {notifications.length}
            </span>
          ) : null}
        </Button>

        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-2 py-1.5 text-xs text-muted-foreground backdrop-blur">
          {user?.avatarUrl ? (
            <Image src={user.avatarUrl} alt="Profile" width={28} height={28} className="rounded-full" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {user?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
          )}
          <div className="hidden leading-tight md:block">
            <p className="font-semibold text-foreground/90">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80">{user?.role ?? 'admin'}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 rounded-full border border-border/60 bg-background/60 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
});

Topbar.displayName = 'Topbar';
