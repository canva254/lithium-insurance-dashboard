"use client";

import { motion } from 'framer-motion';
import {
  Area,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

type AreaChartProps<T extends Record<string, number | string>> = {
  data: T[];
  dataKey: keyof T;
  labelKey: keyof T;
  color?: string;
  height?: number;
};

export function AreaChart<T extends Record<string, number | string>>({
  data,
  dataKey,
  labelKey,
  color = '#38bdf8',
  height = 240,
}: AreaChartProps<T>) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey={labelKey as string} axisLine={false} tickLine={false} tickMargin={12} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tickMargin={12} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
          <Tooltip
            cursor={{ stroke: 'rgba(148, 163, 184, 0.35)' }}
            contentStyle={{ borderRadius: 16, border: '1px solid rgba(148, 163, 184, 0.25)', background: 'var(--tooltip-background, rgba(15,23,42,0.9))', backdropFilter: 'blur(12px)' }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
          />
          <Area type="monotone" dataKey={dataKey as string} stroke={color} strokeWidth={2.4} fill="url(#areaGradient)" />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
