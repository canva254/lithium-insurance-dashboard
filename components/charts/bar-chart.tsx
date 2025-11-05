"use client";

import { motion } from 'framer-motion';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type BarChartProps<T extends Record<string, number | string>> = {
  data: T[];
  labelKey: keyof T;
  valueKey: keyof T;
  color?: string;
};

export function BarChart<T extends Record<string, number | string>>({ data, labelKey, valueKey, color = '#a855f7' }: BarChartProps<T>) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <ResponsiveContainer width="100%" height={260}>
        <RechartsBarChart data={data} barCategoryGap={24} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
          <XAxis dataKey={labelKey as string} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
            contentStyle={{ borderRadius: 16, border: '1px solid rgba(148, 163, 184, 0.25)', background: 'rgba(15, 23, 42, 0.88)', color: 'white' }}
          />
          <Bar dataKey={valueKey as string} radius={[12, 12, 12, 12]} fill={color} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
