'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { usePartnerNotifications, useMarkPartnerNotificationRead } from '@/hooks/usePartnerPackages';

type StatusFilter = 'all' | 'new' | 'read';

const statusLabels: Record<Exclude<StatusFilter, 'all'>, string> = {
  new: 'Unread',
  read: 'Read',
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
};

export default function PartnerNotificationsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { toast } = useToast();
  const { data: notifications = [], isLoading, error, isError } = usePartnerNotifications(
    statusFilter === 'all' ? undefined : statusFilter,
  );
  const markRead = useMarkPartnerNotificationRead();

  const handleMarkRead = async (notificationId: string) => {
    try {
      await markRead.mutateAsync(notificationId);
      toast({ title: 'Marked as read' });
    } catch (err: any) {
      toast({
        title: 'Unable to update notification',
        description: err?.message || 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notification center</h1>
          <p className="text-sm text-muted-foreground">
            Stay on top of review updates, approvals, and requested changes from the admin team.
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'new', 'read'] as StatusFilter[]).map((option) => {
            const isActive = statusFilter === option;
            return (
              <Button
                key={option}
                type="button"
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(option)}
              >
                {option === 'all' ? 'All' : statusLabels[option]}
              </Button>
            );
          })}
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(error as { message?: string } | null)?.message ?? 'Failed to load notifications.'}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-card px-6 py-16 text-center text-sm text-muted-foreground">
          No notifications yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((item) => {
            const status = item.status?.toLowerCase();
            const isUnread = status !== 'read';
            return (
              <li
                key={item.id}
                className="rounded-lg border border-border/60 bg-card px-5 py-4 shadow-sm transition hover:border-primary/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      {isUnread && <Badge variant="secondary">New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.body || 'No additional details provided.'}</p>
                    {item.payload && Object.keys(item.payload).length > 0 ? (
                      <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                        {JSON.stringify(item.payload, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
                    <span>Received {formatDate(item.createdAt)}</span>
                    {item.readAt ? <span>Read {formatDate(item.readAt)}</span> : null}
                    {isUnread ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkRead(item.id)}
                        disabled={markRead.isLoading}
                      >
                        Mark as read
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
