'use client';

/**
 * AnalyticsDashboard Component - Main analytics dashboard container
 *
 * Displays usage metrics, charts, and quota information
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { OverviewMetrics } from './OverviewMetrics';
import { SkillUsageChart } from './SkillUsageChart';
import { ChannelDistributionChart } from './ChannelDistributionChart';
import { TopSkillsTable } from './TopSkillsTable';
import { QuotaUsageCard } from './QuotaUsageCard';
import { DateRangePicker } from './DateRangePicker';
import {
  Download,
  RefreshCw,
  BarChart3,
  Loader2,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  className?: string;
}

type DateRange = '24h' | '7d' | '30d' | '90d' | 'custom';

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle date range change
  const handleDateRangeChange = (value: DateRange, range: { start: Date; end: Date }) => {
    setDateRange(value);
    // In real app, this would trigger data fetch
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Handle export
  const handleExport = () => {
    // In real app, this would trigger CSV export
    console.log('Exporting analytics data...');
  };

  // Mock data - in real app would come from API
  const overviewData = useMemo(() => ({
    totalSessions: 142,
    sessionsChange: 12,
    totalSkillExecutions: 3456,
    skillsChange: 23,
    totalMessages: 12345,
    messagesChange: 18,
    avgResponseTime: 234,
    responseTimeChange: -15,
  }), [dateRange]);

  const skillUsageData = useMemo(() => [
    { date: 'Mon', executions: 120, successful: 115, failed: 5 },
    { date: 'Tue', executions: 150, successful: 145, failed: 5 },
    { date: 'Wed', executions: 180, successful: 170, failed: 10 },
    { date: 'Thu', executions: 140, successful: 135, failed: 5 },
    { date: 'Fri', executions: 200, successful: 190, failed: 10 },
    { date: 'Sat', executions: 90, successful: 88, failed: 2 },
    { date: 'Sun', executions: 75, successful: 73, failed: 2 },
  ], [dateRange]);

  const channelDistributionData = useMemo(() => [
    { channel: 'web' as const, value: 5500, percentage: 45 },
    { channel: 'whatsapp' as const, value: 3700, percentage: 30 },
    { channel: 'telegram' as const, value: 1800, percentage: 15 },
    { channel: 'slack' as const, value: 1200, percentage: 10 },
  ], [dateRange]);

  const topSkillsData = useMemo(() => [
    {
      skillName: 'nexus-graphrag-search',
      displayName: 'GraphRAG Search',
      category: 'nexus-integration',
      executions: 456,
      successRate: 98,
      avgDuration: 234,
      change: 15,
    },
    {
      skillName: 'nexus-mageagent-task',
      displayName: 'MageAgent Task',
      category: 'nexus-integration',
      executions: 234,
      successRate: 95,
      avgDuration: 1500,
      change: 8,
    },
    {
      skillName: 'nexus-communication-email',
      displayName: 'Send Email',
      category: 'communication',
      executions: 189,
      successRate: 99,
      avgDuration: 450,
      change: -3,
    },
    {
      skillName: 'nexus-github-pr-review',
      displayName: 'PR Review',
      category: 'development',
      executions: 123,
      successRate: 92,
      avgDuration: 2800,
      change: 25,
    },
    {
      skillName: 'nexus-fileprocess-upload',
      displayName: 'File Upload',
      category: 'files',
      executions: 98,
      successRate: 97,
      avgDuration: 890,
      change: 0,
    },
  ], [dateRange]);

  if (isLoading) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Analytics
            </h1>
            <p className="text-sm text-gray-500">
              Monitor your OpenClaw usage and performance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('mr-1.5 h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Overview metrics */}
        <OverviewMetrics data={overviewData} className="mb-6" />

        {/* Charts row */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SkillUsageChart data={skillUsageData} />
          <ChannelDistributionChart data={channelDistributionData} />
        </div>

        {/* Bottom row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TopSkillsTable data={topSkillsData} />
          </div>
          <QuotaUsageCard />
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
