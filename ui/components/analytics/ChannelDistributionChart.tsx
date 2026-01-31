'use client';

/**
 * ChannelDistributionChart Component - Pie chart showing message distribution by channel
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { CHANNEL_TYPE_INFO } from '@/stores/channelStore';
import type { ChannelType } from '@/stores/channelStore';

interface ChannelData {
  channel: ChannelType;
  value: number;
  percentage: number;
}

interface ChannelDistributionChartProps {
  data: ChannelData[];
  className?: string;
}

// Channel colors
const COLORS: Record<ChannelType, string> = {
  whatsapp: '#25D366',
  telegram: '#0088CC',
  slack: '#4A154B',
  discord: '#5865F2',
  signal: '#3A76F0',
  teams: '#6264A7',
  web: '#3B82F6',
};

// Custom tooltip component
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const channelInfo = CHANNEL_TYPE_INFO[data.channel as ChannelType];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-1 font-medium text-gray-900 dark:text-white">
        {channelInfo?.name || data.channel}
      </p>
      <p className="text-sm text-gray-500">
        {data.value.toLocaleString()} messages ({data.percentage}%)
      </p>
    </div>
  );
}

// Custom legend
function CustomLegend({ payload }: any) {
  return (
    <div className="flex flex-wrap justify-center gap-4 pt-4">
      {payload.map((entry: any, index: number) => {
        const channelInfo = CHANNEL_TYPE_INFO[entry.value as ChannelType];
        return (
          <div key={index} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {channelInfo?.name || entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ChannelDistributionChart({ data, className }: ChannelDistributionChartProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900', className)}>
      <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
        Channel Distribution
      </h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              nameKey="channel"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.channel] || '#888888'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ChannelDistributionChart;
