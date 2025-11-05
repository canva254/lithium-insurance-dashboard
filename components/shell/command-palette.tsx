"use client";

import { Command } from 'cmdk';
import { ArrowUpRight, Command as CommandIcon, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { memo, useEffect, useMemo, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { NAV_ITEMS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const QUICK_ACTIONS = [
  { id: 'go-analytics', label: 'View analytics', href: '/analytics', icon: ArrowUpRight },
  { id: 'go-packages', label: 'Manage packages', href: '/packages', icon: ArrowUpRight },
  { id: 'go-policies', label: 'Review policies', href: '/policies', icon: ArrowUpRight },
  { id: 'toggle-theme', label: 'Toggle theme', action: 'toggle-theme', icon: ArrowUpRight },
  { id: 'view-reviews', label: 'Open review queue', href: '/reviews', icon: ArrowUpRight },
];

type CommandPaletteProps = {
  onToggleTheme?: () => void;
};

export const CommandPalette = memo(function CommandPalette({ onToggleTheme }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        ...item,
        active: pathname === item.href || pathname.startsWith(`${item.href}/`),
      })),
    [pathname],
  );

  const handleSelect = (href: string | undefined, action?: string) => {
    setOpen(false);
    setSearch('');
    startTransition(() => {
      if (action === 'toggle-theme') {
        onToggleTheme?.();
        return;
      }
      if (!href) return;
      router.push(href);
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        className="hidden items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-[0_0_0_1px_rgba(148,163,184,0.2)] backdrop-blur lg:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Quick actions</span>
        <kbd className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground/70">
          <CommandIcon className="h-3 w-3" />K
        </kbd>
      </Button>

      <Command.Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          setSearch('');
        }}
        label="Command menu"
        className={cn(
          'fixed inset-0 z-[999] flex items-start justify-center bg-black/40 p-4 backdrop-blur-sm',
          !open && 'pointer-events-none opacity-0',
        )}
      >
        <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border/60 bg-background/95 shadow-2xl">
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search destinations or quick actions..."
            className="w-full border-b border-border/70 bg-transparent px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <Command.List className="max-h-[70vh] overflow-y-auto px-2 pb-4 pt-2">
            <Command.Group heading="Navigation">
              {navItems.map((item) => (
                <Command.Item
                  key={item.href}
                  value={item.label}
                  onSelect={() => handleSelect(item.href)}
                  className="flex items-center justify-between rounded-2xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                >
                  <span>{item.label}</span>
                  {item.active ? <span className="text-[10px] uppercase tracking-wide text-primary">Active</span> : null}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Quick actions">
              {QUICK_ACTIONS.map(({ id, label, href, action, icon: Icon }) => (
                <Command.Item
                  key={id}
                  value={label}
                  onSelect={() => handleSelect(href, action)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-emerald-500/10 hover:text-emerald-500 focus:bg-emerald-500/10 focus:text-emerald-500"
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>
          </Command.List>
        </div>
      </Command.Dialog>
    </>
  );
});

CommandPalette.displayName = 'CommandPalette';
