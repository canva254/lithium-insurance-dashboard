"use client";

import { motion, useSpring, useTransform } from 'framer-motion';
import { memo, useEffect } from 'react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type KPIBadgeProps = {
  trend?: number;
};

function TrendBadge({ trend }: KPIBadgeProps) {
  if (trend == null) return null;
  const positive = trend >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur transition-colors',
        positive
          ? 'bg-emerald-500/15 text-emerald-500 ring-1 ring-inset ring-emerald-500/30'
          : 'bg-rose-500/15 text-rose-500 ring-1 ring-inset ring-rose-500/30',
      )}
    >
      {positive ? '▲' : '▼'} {Math.abs(trend)}%
    </span>
  );
}

type KPIProps = {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  description?: string;
  trend?: number;
  accent?: 'primary' | 'blue' | 'violet' | 'orange';
};

const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export const KpiCard = memo(function KpiCard({ title, value, prefix, suffix, description, trend, accent = 'primary' }: KPIProps) {
  const motionValue = useSpring(value, { stiffness: 120, damping: 24 });
  const animatedValue = useTransform(motionValue, (latest) => formatter.format(latest));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  const accentClass = (() => {
    switch (accent) {
      case 'blue':
        return 'from-blue-500/15 via-blue-500/5 to-transparent text-blue-500';
      case 'violet':
        return 'from-violet-500/15 via-violet-500/5 to-transparent text-violet-500';
      case 'orange':
        return 'from-orange-500/15 via-orange-500/5 to-transparent text-orange-500';
      default:
        return 'from-sky-500/15 via-sky-500/5 to-transparent text-sky-500';
    }
  })();

  return (
    <Card className="relative overflow-hidden">
      <div className={cn('pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-80', accentClass)} />
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-[0.14em] text-muted-foreground/80">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="mt-2">
        <motion.span className="text-3xl font-semibold text-foreground md:text-4xl">
          {prefix}
          <motion.span>{animatedValue}</motion.span>
          {suffix}
        </motion.span>
      </CardContent>
      <CardFooter className="mt-4 justify-between">
        <TrendBadge trend={trend} />
        <span className="text-[11px] text-muted-foreground/80">vs. previous period</span>
      </CardFooter>
    </Card>
  );
});
