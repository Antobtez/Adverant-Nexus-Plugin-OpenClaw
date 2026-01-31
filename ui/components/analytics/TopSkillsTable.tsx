'use client';

/**
 * TopSkillsTable Component - Table showing most used skills
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SkillUsageData {
  skillName: string;
  displayName: string;
  category: string;
  executions: number;
  successRate: number;
  avgDuration: number;
  change?: number;
}

interface TopSkillsTableProps {
  data: SkillUsageData[];
  className?: string;
}

export function TopSkillsTable({ data, className }: TopSkillsTableProps) {
  // Get max executions for bar width calculation
  const maxExecutions = Math.max(...data.map((s) => s.executions));

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900', className)}>
      <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
        Top Skills
      </h3>
      <div className="space-y-3">
        {data.map((skill, index) => (
          <div
            key={skill.skillName}
            className="relative rounded-lg border border-gray-100 p-3 dark:border-gray-800"
          >
            {/* Background bar */}
            <div
              className="absolute inset-y-0 left-0 rounded-lg bg-blue-50 dark:bg-blue-900/20"
              style={{ width: `${(skill.executions / maxExecutions) * 100}%` }}
            />

            {/* Content */}
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {skill.displayName}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {skill.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">{skill.skillName}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                {/* Executions */}
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {skill.executions.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">executions</p>
                </div>

                {/* Success rate */}
                <div className="text-right">
                  <p
                    className={cn(
                      'font-semibold',
                      skill.successRate >= 90
                        ? 'text-green-600 dark:text-green-400'
                        : skill.successRate >= 70
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {skill.successRate}%
                  </p>
                  <p className="text-xs text-gray-500">success</p>
                </div>

                {/* Avg duration */}
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {skill.avgDuration}ms
                  </p>
                  <p className="text-xs text-gray-500">avg time</p>
                </div>

                {/* Change indicator */}
                {skill.change !== undefined && (
                  <div
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      skill.change > 0 && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                      skill.change < 0 && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      skill.change === 0 && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    )}
                  >
                    {skill.change > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : skill.change < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {Math.abs(skill.change)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopSkillsTable;
