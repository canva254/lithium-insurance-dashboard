"use client";

import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  Columns3,
  Compass,
  FolderCog,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  Network,
  Settings2,
  ShieldCheck,
  Users2,
  Wallet,
  Workflow,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { memo, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NAV_ITEMS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': LayoutDashboard,
  '/analytics': BarChart3,
  '/services': Compass,
  '/tenants': Building2,
  '/ai-settings': Bot,
  '/packages': FolderCog,
  '/policies': ShieldCheck,
  '/reviews': LifeBuoy,
  '/onboarding': Network,
  '/distribution': Columns3,
  '/automation': Workflow,
  '/users': Users2,
  '/vendors': Wallet,
  '/pricing': Settings2,
  '/security': LockKeyhole,
  '/workflows': Activity,
};

type SidebarProps = {
  items: typeof NAV_ITEMS[number][];
  collapsed?: boolean;
  onToggle?: (next: boolean) => void;
  onPrefetch?: (href: string) => void;
  onNavigate?: () => void;
};

export const Sidebar = memo(function Sidebar({ items, collapsed = false, onToggle, onPrefetch, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [, startTransition] = useTransition();
  const fallbackTimeoutRef = useRef<number | null>(null);

  const computedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        icon: ICONS[item.href] ?? LayoutDashboard,
        active: pathname === item.href || pathname.startsWith(`${item.href}/`),
      })),
    [items, pathname],
  );

  const toggle = () => {
    setIsCollapsed((value) => {
      const next = !value;
      onToggle?.(next);
      return next;
    });
  };

  useEffect(() => {
    if (!fallbackTimeoutRef.current) {
      return;
    }
    window.clearTimeout(fallbackTimeoutRef.current);
    fallbackTimeoutRef.current = null;
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current) {
        window.clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <aside
      className={cn(
        'group/sidebar sticky top-0 flex h-screen flex-col border-r border-border/60 bg-gradient-to-b from-background/95 via-background/80 to-background/60 px-3 py-5 backdrop-blur-xl transition-all duration-300',
        isCollapsed ? 'w-[5.2rem]' : 'w-64',
      )}
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.75)]" aria-hidden />
          <span className={cn('text-sm font-semibold tracking-wide text-foreground transition-all', isCollapsed && 'opacity-0')}>Lithium Admin</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="h-7 w-7 rounded-full border border-border/50 bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-primary"
          onClick={toggle}
        >
          <span className="text-lg leading-4">{isCollapsed ? '›' : '‹'}</span>
        </Button>
      </div>

      <ScrollArea className="mt-6 flex-1 overflow-hidden">
        <nav className="space-y-1 pr-1">
          {computedItems.map(({ href, label, icon: Icon, active }) => (
            <button
              key={href}
              type="button"
              className="group/item relative flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-current={active ? 'page' : undefined}
              onMouseEnter={() => onPrefetch?.(href)}
              onFocus={() => onPrefetch?.(href)}
              onClick={() => {
                onNavigate?.();
                if (active) {
                  return;
                }
                if (typeof window === 'undefined') {
                  return;
                }

                const currentPath = window.location.pathname;

                startTransition(() => {
                  try {
                    router.push(href);
                  } catch {
                    window.location.href = href;
                  }
                });

                if (fallbackTimeoutRef.current) {
                  window.clearTimeout(fallbackTimeoutRef.current);
                }

                fallbackTimeoutRef.current = window.setTimeout(() => {
                  if (window.location.pathname === currentPath) {
                    window.location.href = href;
                  }
                }, 350);
              }}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className={cn('truncate transition-opacity', isCollapsed && 'opacity-0')}>{label}</span>
              {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(59,130,246,0.25)]" aria-hidden /> : null}
            </button>
          ))}
        </nav>
      </ScrollArea>

      <div className="mt-6 space-y-2 rounded-2xl border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground/90">
        <p className={cn('font-semibold text-foreground/90', isCollapsed && 'opacity-0')}>AI Copilot</p>
        <p className={cn('leading-relaxed', isCollapsed && 'opacity-0')}>
          Surface trends and pinpoint anomalies with contextual insights.
        </p>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
