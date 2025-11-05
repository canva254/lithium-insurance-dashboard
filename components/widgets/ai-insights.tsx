"use client";

import { Lightbulb, TrendingUp, TriangleAlert } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Insight = {
  id: string;
  title: string;
  detail: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  impact?: 'high' | 'medium' | 'low';
};

type AIInsightsProps = {
  insights: Insight[];
};

const ICON_MAP: Record<NonNullable<Insight['sentiment']>, React.ComponentType<{ className?: string }>> = {
  positive: TrendingUp,
  negative: TriangleAlert,
  neutral: Lightbulb,
};

const BADGE_STYLES: Record<NonNullable<Insight['impact']>, string> = {
  high: 'bg-rose-500/10 text-rose-500 ring-1 ring-inset ring-rose-500/30',
  medium: 'bg-amber-500/10 text-amber-500 ring-1 ring-inset ring-amber-500/30',
  low: 'bg-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-500/30',
};

export function AIInsights({ insights }: AIInsightsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI insights</CardTitle>
        <CardDescription>Generated anomalies and trend highlights across your tenants.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight) => {
          const Icon = ICON_MAP[insight.sentiment ?? 'neutral'] ?? Lightbulb;
          return (
            <div
              key={insight.id}
              className="rounded-2xl border border-border/50 bg-background/80 p-4 backdrop-blur transition hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground/90">{insight.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">{insight.detail}</p>
                  </div>
                </div>
                {insight.impact ? (
                  <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide', BADGE_STYLES[insight.impact])}>
                    {insight.impact}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
