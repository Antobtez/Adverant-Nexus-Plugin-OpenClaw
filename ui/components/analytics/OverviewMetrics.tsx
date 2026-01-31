'use client';

/**
 * OverviewMetrics Component - Key metrics cards for analytics dashboard
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Sparkles,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  iconColor: string;
}

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconBgColor,
  iconColor,
}: MetricCardProps) {
  const hasChange = change !== undefined && change !== 0;
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconBgColor)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        {hasChange && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              isPositive && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              isNegative && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="mt-0.5 text-sm text-gray-500">{title}</p>
      </div>
      {changeLabel && (
        <p className="mt-2 text-xs text-gray-400">{changeLabel}</p>
      )}
    </div>
  );
}

interface OverviewMetricsProps {
  data: {
    totalSessions: number;
    sessionsChange?: number;
    totalSkillExecutions: number;
    skillsChange?: number;
    totalMessages: number;
    messagesChange?: number;
    avgResponseTime: number;
    responseTimeChange?: number;
  };
  className?: string;
}

export function OverviewMetrics({ data, className }: OverviewMetricsProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', className)}>
      <MetricCard
        title="Total Sessions"
        value={data.totalSessions}
        change={data.sessionsChange}
        changeLabel="vs last period"
        icon={Users}
        iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        iconColor="text-blue-600 dark:text-blue-400"
      />
      <MetricCard
        title="Skills Executed"
        value={data.totalSkillExecutions}
        change={data.skillsChange}
        changeLabel="vs last period"
        icon={Sparkles}
        iconBgColor="bg-purple-100 dark:bg-purple-900/30"
        iconColor="text-purple-600 dark:text-purple-400"
      />
      <MetricCard
        title="Total Messages"
        value={data.totalMessages}
        change={data.messagesChange}
        changeLabel="vs last period"
        icon={MessageSquare}
        iconBgColor="bg-green-100 dark:bg-green-900/30"
        iconColor="text-green-600 dark:text-green-400"
      />
      <MetricCard
        title="Avg Response Time"
        value={`${data.avgResponseTime}ms`}
        change={data.responseTimeChange}
        changeLabel="vs last period"
        icon={Clock}
        iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
        iconColor="text-yellow-600 dark:text-yellow-400"
      />
    </div>
  );
}

export default OverviewMetrics;
