'use client';

/**
 * SkillUsageChart Component - Line chart showing skills executed over time
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DataPoint {
  date: string;
  executions: number;
  successful: number;
  failed: number;
}

interface SkillUsageChartProps {
  data: DataPoint[];
  className?: string;
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-2 font-medium text-gray-900 dark:text-white">{label}</p>
      {payload.map((item: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-500">{item.name}:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {item.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SkillUsageChart({ data, className }: SkillUsageChartProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900', className)}>
      <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
        Skills Executed Over Time
      </h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700"
            />
            <XAxis
              dataKey="date"
              stroke="currentColor"
              className="text-gray-500 text-xs"
              tick={{ fill: 'currentColor', fontSize: 12 }}
            />
            <YAxis
              stroke="currentColor"
              className="text-gray-500 text-xs"
              tick={{ fill: 'currentColor', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
            />
            <Line
              type="monotone"
              dataKey="executions"
              name="Total"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="successful"
              name="Successful"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="failed"
              name="Failed"
              stroke="#EF4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default SkillUsageChart;
