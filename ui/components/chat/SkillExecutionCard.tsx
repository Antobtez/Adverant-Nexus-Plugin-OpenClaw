'use client';

/**
 * SkillExecutionCard Component - Displays skill execution status inline in chat
 * Shows progress, results, and errors for skill executions
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { SkillExecution } from '@/stores/sessionStore';

interface SkillExecutionCardProps {
  execution: SkillExecution;
  className?: string;
  onRetry?: () => void;
}

export function SkillExecutionCard({ execution, className, onRetry }: SkillExecutionCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const statusConfig = {
    pending: {
      icon: Clock,
      label: 'Pending',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50 dark:bg-gray-900',
      borderColor: 'border-gray-200 dark:border-gray-700',
    },
    running: {
      icon: Loader2,
      label: 'Running',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      animate: true,
    },
    completed: {
      icon: CheckCircle2,
      label: 'Completed',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    error: {
      icon: XCircle,
      label: 'Error',
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
    },
  };

  const config = statusConfig[execution.status];
  const Icon = config.icon;

  // Format execution time
  const formatTime = (ms?: number) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div
      className={cn(
        'w-full max-w-sm overflow-hidden rounded-lg border',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            execution.status === 'running'
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : execution.status === 'completed'
                ? 'bg-green-100 dark:bg-green-900/30'
                : execution.status === 'error'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-gray-100 dark:bg-gray-800'
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4',
              config.color,
              config.animate && 'animate-spin'
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-gray-400" />
            <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {execution.skillName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{config.label}</span>
            {execution.executionTimeMs && (
              <>
                <span>•</span>
                <span>{formatTime(execution.executionTimeMs)}</span>
              </>
            )}
          </div>
        </div>

        {/* Expand/collapse button */}
        {(execution.input || execution.output || execution.error) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Progress bar for running state */}
      {execution.status === 'running' && execution.progress !== undefined && (
        <div className="px-3 pb-2">
          <Progress value={execution.progress} className="h-1.5" />
          <div className="mt-1 text-right text-xs text-gray-500">
            {execution.progress}% complete
          </div>
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-3 dark:border-gray-700">
          {/* Input parameters */}
          {execution.input && Object.keys(execution.input).length > 0 && (
            <div className="mb-3">
              <div className="mb-1 text-xs font-medium uppercase text-gray-500">Input</div>
              <pre className="overflow-x-auto rounded bg-gray-100 p-2 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {JSON.stringify(execution.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output result */}
          {execution.output && (
            <div className="mb-3">
              <div className="mb-1 text-xs font-medium uppercase text-gray-500">Output</div>
              <pre className="max-h-40 overflow-auto rounded bg-gray-100 p-2 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {JSON.stringify(execution.output, null, 2)}
              </pre>
            </div>
          )}

          {/* Error message */}
          {execution.error && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase text-red-500">Error</div>
              <div className="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {execution.error}
              </div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Retry execution
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SkillExecutionCard;
