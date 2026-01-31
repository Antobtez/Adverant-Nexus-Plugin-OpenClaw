'use client';

/**
 * CronJobCard Component - Individual cron job card with status and quick actions
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Sparkles,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
} from 'lucide-react';
import type { CronJob, CronJobStatus } from '@/stores/cronStore';

interface CronJobCardProps {
  job: CronJob;
  isSelected?: boolean;
  onClick?: () => void;
  onToggleEnabled?: () => void;
  onRunNow?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  compact?: boolean;
  className?: string;
}

// Status configuration
const statusConfig: Record<
  CronJobStatus,
  { color: string; bgColor: string; icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  active: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle,
    label: 'Active',
  },
  paused: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: Pause,
    label: 'Paused',
  },
  running: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Play,
    label: 'Running',
  },
  error: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: AlertCircle,
    label: 'Error',
  },
};

// Format next run time
function formatNextRun(date: Date | undefined): string {
  if (!date) return 'Not scheduled';

  const now = new Date();
  const next = new Date(date);
  const diff = next.getTime() - now.getTime();

  if (diff < 0) return 'Overdue';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `in ${minutes}m`;
  if (hours < 24) return `in ${hours}h`;
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}

// Format cron expression to human readable
function formatCronExpression(expression: string): string {
  // Basic cron pattern matching for common cases
  const parts = expression.split(' ');
  if (parts.length !== 5) return expression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Every minute
  if (expression === '* * * * *') return 'Every minute';

  // Every hour
  if (minute !== '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every hour at :${minute.padStart(2, '0')}`;
  }

  // Daily at specific time
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Daily at ${hour}:${minute.padStart(2, '0')}`;
  }

  // Weekly
  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[parseInt(dayOfWeek)] || dayOfWeek;
    return `Every ${dayName} at ${hour}:${minute.padStart(2, '0')}`;
  }

  // Monthly
  if (month === '*' && dayOfWeek === '*' && dayOfMonth !== '*') {
    return `Monthly on day ${dayOfMonth} at ${hour}:${minute.padStart(2, '0')}`;
  }

  return expression;
}

export function CronJobCard({
  job,
  isSelected = false,
  onClick,
  onToggleEnabled,
  onRunNow,
  onDelete,
  onDuplicate,
  compact = false,
  className,
}: CronJobCardProps) {
  const status = statusConfig[job.status];
  const StatusIcon = status.icon;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
            : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800',
          className
        )}
      >
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            status.bgColor
          )}
        >
          <Clock className={cn('h-5 w-5', status.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-gray-900 dark:text-white">
              {job.name}
            </span>
            {!job.enabled && (
              <Badge variant="outline" className="text-xs">
                Disabled
              </Badge>
            )}
          </div>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
            {formatCronExpression(job.schedule)}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>Next: {formatNextRun(job.nextRun)}</p>
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={onClick}
        className="flex w-full items-start gap-4 p-4 text-left"
      >
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg',
            status.bgColor
          )}
        >
          <Clock className={cn('h-6 w-6', status.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-gray-900 dark:text-white">
              {job.name}
            </h3>
            <Badge
              variant="secondary"
              className={cn('text-xs', status.bgColor, status.color)}
            >
              <StatusIcon className="mr-1 h-3 w-3" />
              {status.label}
            </Badge>
          </div>

          <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
            {formatCronExpression(job.schedule)}
          </p>

          {/* Skill info */}
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {job.skillName}
            </span>
          </div>

          {/* Stats row */}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Next: {formatNextRun(job.nextRun)}
            </span>
            <span>{job.runCount} runs</span>
            {job.lastRun && (
              <span>
                Last: {new Date(job.lastRun).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Last run status */}
      {job.lastRunStatus && (
        <div className="mx-4 mb-2">
          {job.lastRunStatus === 'success' ? (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              Last run completed successfully
              {job.lastRunDurationMs && (
                <span className="text-green-600">({job.lastRunDurationMs}ms)</span>
              )}
            </div>
          ) : job.lastRunStatus === 'error' ? (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              Last run failed
              {job.lastRunError && (
                <span className="truncate">: {job.lastRunError}</span>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2 dark:border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled?.();
          }}
        >
          {job.enabled ? (
            <>
              <Pause className="mr-1.5 h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-1.5 h-4 w-4" />
              Resume
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRunNow?.();
          }}
          disabled={job.status === 'running'}
        >
          <Play className="mr-1.5 h-4 w-4" />
          Run Now
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate?.();
          }}
        >
          <Copy className="mr-1.5 h-4 w-4" />
          Duplicate
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export default CronJobCard;
