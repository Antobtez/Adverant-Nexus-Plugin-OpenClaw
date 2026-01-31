'use client';

/**
 * QuotaUsageCard Component - Display tier quota usage
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useQuota } from '@/stores/appStore';
import {
  Users,
  Sparkles,
  Hash,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface QuotaItemProps {
  label: string;
  current: number;
  max: number;
  icon: React.ComponentType<{ className?: string }>;
}

function QuotaItem({ label, current, max, icon: Icon }: QuotaItemProps) {
  const percentage = max === -1 ? 0 : (current / max) * 100;
  const isUnlimited = max === -1;
  const isNearLimit = percentage >= 80 && percentage < 100;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        </div>
        <span
          className={cn(
            'text-sm font-medium',
            isAtLimit
              ? 'text-red-600 dark:text-red-400'
              : isNearLimit
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-gray-900 dark:text-white'
          )}
        >
          {current.toLocaleString()}
          {!isUnlimited && `/${max.toLocaleString()}`}
          {isUnlimited && ' (unlimited)'}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={Math.min(percentage, 100)}
          className={cn(
            'h-2',
            isAtLimit && '[&>div]:bg-red-500',
            isNearLimit && '[&>div]:bg-yellow-500'
          )}
        />
      )}
    </div>
  );
}

interface QuotaUsageCardProps {
  className?: string;
}

export function QuotaUsageCard({ className }: QuotaUsageCardProps) {
  const quota = useQuota();

  if (!quota) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900', className)}>
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-gray-500">Loading quota information...</p>
        </div>
      </div>
    );
  }

  const { tier, limits, current } = quota;

  // Determine tier badge color
  const tierBadgeClass =
    tier === 'government'
      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      : tier === 'teams'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Quota Usage
        </h3>
        <Badge className={tierBadgeClass}>
          {tier === 'open_source' ? 'Open Source' : tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
        </Badge>
      </div>

      <div className="space-y-4">
        <QuotaItem
          label="Active Sessions"
          current={current.sessions}
          max={limits.max_sessions}
          icon={Users}
        />
        <QuotaItem
          label="Skills / Minute"
          current={current.skills_this_minute}
          max={limits.max_skills_per_minute}
          icon={Sparkles}
        />
        <QuotaItem
          label="Connected Channels"
          current={current.channels}
          max={limits.max_channels}
          icon={Hash}
        />
        <QuotaItem
          label="Cron Jobs"
          current={current.cron_jobs}
          max={limits.max_cron_jobs}
          icon={Clock}
        />
      </div>

      {/* Warning if near limits */}
      {(current.sessions / limits.max_sessions >= 0.8 ||
        current.channels / limits.max_channels >= 0.8 ||
        current.cron_jobs / limits.max_cron_jobs >= 0.8) &&
        limits.max_sessions !== -1 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                Approaching Quota Limits
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Consider upgrading your plan for higher limits.
              </p>
            </div>
          </div>
        )}

      {/* All good message if below limits */}
      {current.sessions / limits.max_sessions < 0.8 &&
        current.channels / limits.max_channels < 0.8 &&
        current.cron_jobs / limits.max_cron_jobs < 0.8 &&
        limits.max_sessions !== -1 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
            <CheckCircle className="mt-0.5 h-4 w-4 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Quota Looking Good
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                You&apos;re well within your plan limits.
              </p>
            </div>
          </div>
        )}
    </div>
  );
}

export default QuotaUsageCard;
