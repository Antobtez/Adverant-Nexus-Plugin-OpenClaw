'use client';

/**
 * SkillCatalog Component - Categorized skill list with search and filters
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton';
import { SkillCard, SkillCardCompact } from './SkillCard';
import { useSkillStore, useSkills, useFavoriteSkills, type SkillCategory } from '@/stores/skillStore';
import { Search, Star, Grid, List, X, SlidersHorizontal } from 'lucide-react';

interface SkillCatalogProps {
  onSkillSelect?: (skillId: string) => void;
  viewMode?: 'grid' | 'list';
  className?: string;
}

// Category display names and icons
const categoryInfo: Record<SkillCategory | 'all', { label: string; color: string }> = {
  all: { label: 'All Skills', color: 'bg-gray-500' },
  'nexus-integration': { label: 'Nexus', color: 'bg-blue-500' },
  knowledge: { label: 'Knowledge', color: 'bg-purple-500' },
  automation: { label: 'Automation', color: 'bg-green-500' },
  communication: { label: 'Communication', color: 'bg-orange-500' },
  development: { label: 'Development', color: 'bg-cyan-500' },
  files: { label: 'Files', color: 'bg-yellow-500' },
  calendar: { label: 'Calendar', color: 'bg-pink-500' },
  analytics: { label: 'Analytics', color: 'bg-indigo-500' },
  legal: { label: 'Legal', color: 'bg-red-500' },
  media: { label: 'Media', color: 'bg-violet-500' },
  security: { label: 'Security', color: 'bg-gray-500' },
  robotics: { label: 'Robotics', color: 'bg-emerald-500' },
  browser: { label: 'Browser', color: 'bg-amber-500' },
  terminal: { label: 'Terminal', color: 'bg-slate-500' },
  custom: { label: 'Custom', color: 'bg-teal-500' },
};

export function SkillCatalog({ onSkillSelect, viewMode = 'grid', className }: SkillCatalogProps) {
  const skills = useSkills();
  const favoriteSkills = useFavoriteSkills();
  const {
    skillsLoading,
    skillsError,
    categories,
    selectedCategory,
    searchQuery,
    favoriteSkillIds,
    selectedSkillId,
    setSelectedCategory,
    setSearchQuery,
    selectSkill,
    toggleFavorite,
    getFilteredSkills,
  } = useSkillStore();

  const [internalViewMode, setInternalViewMode] = React.useState<'grid' | 'list'>(viewMode);
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);

  // Get filtered skills
  const filteredSkills = useMemo(() => {
    let result = getFilteredSkills();
    if (showFavoritesOnly) {
      result = result.filter((s) => favoriteSkillIds.includes(s.id));
    }
    return result;
  }, [getFilteredSkills, showFavoritesOnly, favoriteSkillIds]);

  // Handle skill selection
  const handleSkillClick = (skillId: string) => {
    selectSkill(skillId);
    onSkillSelect?.(skillId);
  };

  // Handle favorite toggle
  const handleFavoriteClick = (e: React.MouseEvent, skillId: string) => {
    e.stopPropagation();
    toggleFavorite(skillId);
  };

  // Loading state
  if (skillsLoading) {
    return (
      <div className={cn('p-4', className)}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (skillsError) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8', className)}>
        <p className="text-sm text-red-500">{skillsError}</p>
        <Button variant="outline" size="sm" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header with search and filters */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="mt-3 flex items-center justify-between gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setInternalViewMode('grid')}
              className={cn(
                'rounded-l-lg p-2',
                internalViewMode === 'grid'
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setInternalViewMode('list')}
              className={cn(
                'rounded-r-lg p-2',
                internalViewMode === 'list'
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Favorites filter */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
              showFavoritesOnly
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            <Star className={cn('h-4 w-4', showFavoritesOnly && 'fill-current')} />
            <span>Favorites ({favoriteSkillIds.length})</span>
          </button>
        </div>

        {/* Category tabs */}
        <div className="mt-3 flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            All ({skills.length})
          </button>
          {categories.map((category) => {
            const info = categoryInfo[category] || categoryInfo.custom;
            const count = skills.filter((s) => s.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                )}
              >
                {info.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills grid/list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <SlidersHorizontal className="h-12 w-12 text-gray-300 dark:text-gray-700" />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {searchQuery || selectedCategory !== 'all' || showFavoritesOnly
                ? 'No skills match your filters'
                : 'No skills available'}
            </p>
            {(searchQuery || selectedCategory !== 'all' || showFavoritesOnly) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setShowFavoritesOnly(false);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : internalViewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                isSelected={selectedSkillId === skill.id}
                isFavorite={favoriteSkillIds.includes(skill.id)}
                onClick={() => handleSkillClick(skill.id)}
                onFavoriteClick={(e) => handleFavoriteClick(e, skill.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSkills.map((skill) => (
              <SkillCardCompact
                key={skill.id}
                skill={skill}
                isSelected={selectedSkillId === skill.id}
                onClick={() => handleSkillClick(skill.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-800">
        <div className="text-xs text-gray-500">
          Showing {filteredSkills.length} of {skills.length} skills
        </div>
      </div>
    </div>
  );
}

export default SkillCatalog;
