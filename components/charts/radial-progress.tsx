"use client";

import { motion } from 'framer-motion';
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';

type RadialProgressProps = {
  value: number;
  max?: number;
  color?: string;
};

export function RadialProgress({ value, max = 100, color = '#38bdf8' }: RadialProgressProps) {
  const percentage = Math.min(Math.max(value / max, 0), 1) * 100;
  const chartData = [{ name: 'progress', value: percentage, fill: color }];

  return (
    <motion.div initial={{ opacity: 0, rotate: -8 }} animate={{ opacity: 1, rotate: 0 }} transition={{ duration: 0.45 }}>
      <ResponsiveContainer width="100%" height={220}>
        <RadialBarChart
          innerRadius="60%"
          outerRadius="100%"
          barSize={14}
          data={chartData}
          startAngle={220}
          endAngle={-40}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={14} />
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="hsl(var(--foreground))"
            style={{ fontSize: '1.125rem', fontWeight: 600 }}
          >
            {percentage.toFixed(0)}%
          </text>
        </RadialBarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
