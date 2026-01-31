'use client';

/**
 * Skeleton Component - Loading placeholder animations
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'default',
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-none',
        variant === 'default' && 'rounded-md',
        animation === 'pulse' && 'animate-pulse',
        animation === 'wave' && 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]',
        className
      )}
      {...props}
    />
  );
}

// Preset skeleton components
export function SkeletonText({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 && 'w-4/5')}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-gray-200 p-4 dark:border-gray-700', className)}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="h-12 w-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4">
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return <Skeleton variant="circular" className={cn(sizeClasses[size], className)} />;
}

export function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-10 w-24 rounded-lg', className)} />;
}

export function SkeletonInput({ className }: { className?: string }) {
  return <Skeleton className={cn('h-10 w-full rounded-md', className)} />;
}

export default Skeleton;
