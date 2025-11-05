"use client";

import { motion } from 'framer-motion';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

type DonutChartProps<T extends { name: string; value: number; color?: string }> = {
  data: T[];
  innerRadius?: number;
  outerRadius?: number;
};

const DEFAULT_COLORS = ['#38bdf8', '#a855f7', '#f97316', '#22c55e', '#facc15'];

export function DonutChart<T extends { name: string; value: number; color?: string }>({
  data,
  innerRadius = 65,
  outerRadius = 100,
}: DonutChartProps<T>) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius={outerRadius} strokeWidth={2}>
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                className="transition hover:opacity-80"
              />
            ))}
          </Pie>
          <Tooltip
            cursor={false}
            contentStyle={{ borderRadius: 16, border: '1px solid rgba(148, 163, 184, 0.25)', background: 'rgba(15, 23, 42, 0.88)', color: 'white' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
