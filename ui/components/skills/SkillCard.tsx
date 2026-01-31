'use client';

/**
 * SkillCard Component - Skill preview card for catalog
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, CheckCircle, Sparkles } from 'lucide-react';
import type { Skill, SkillStats } from '@/stores/skillStore';

interface SkillCardProps {
  skill: Skill;
  isSelected?: boolean;
  isFavorite?: boolean;
  stats?: SkillStats;
  onClick?: () => void;
  onFavoriteClick?: (e: React.MouseEvent) => void;
}

// Category colors
const categoryColors: Record<string, { bg: string; text: string }> = {
  'nexus-integration': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  knowledge: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  automation: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  communication: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
  development: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400' },
  files: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  calendar: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400' },
  analytics: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400' },
  legal: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  media: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400' },
  security: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400' },
  custom: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400' },
};

export function SkillCard({
  skill,
  isSelected,
  isFavorite,
  stats,
  onClick,
  onFavoriteClick,
}: SkillCardProps) {
  const categoryStyle = categoryColors[skill.category] || categoryColors.custom;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer rounded-lg border p-4 transition-all',
        isSelected
          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-900/20'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
      )}
    >
      {/* Favorite button */}
      <button
        onClick={onFavoriteClick}
        className={cn(
          'absolute right-3 top-3 rounded-full p-1 transition-colors',
          isFavorite
            ? 'text-yellow-500'
            : 'text-gray-300 hover:text-yellow-500 dark:text-gray-600'
        )}
      >
        <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            categoryStyle.bg
          )}
        >
          <Sparkles className={cn('h-5 w-5', categoryStyle.text)} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h3 className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {skill.displayName}
          </h3>
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {skill.name}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
        {skill.description}
      </p>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <Badge variant="secondary" className={cn(categoryStyle.bg, categoryStyle.text, 'text-xs')}>
          {skill.category}
        </Badge>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {stats.executions}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {stats.avgTimeMs}ms
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      {skill.tags && skill.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            >
              {tag}
            </span>
          ))}
          {skill.tags.length > 3 && (
            <span className="text-xs text-gray-400">+{skill.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for lists
export function SkillCardCompact({
  skill,
  isSelected,
  onClick,
}: {
  skill: Skill;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const categoryStyle = categoryColors[skill.category] || categoryColors.custom;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
          categoryStyle.bg
        )}
      >
        <Sparkles className={cn('h-4 w-4', categoryStyle.text)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {skill.displayName}
        </div>
        <div className="truncate text-xs text-gray-500 dark:text-gray-400">
          {skill.description}
        </div>
      </div>
    </button>
  );
}

export default SkillCard;
