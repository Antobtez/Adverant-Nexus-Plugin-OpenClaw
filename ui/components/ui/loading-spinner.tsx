'use client';

/**
 * LoadingSpinner Component - Various loading indicators
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
  variant?: 'default' | 'primary' | 'white';
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const variantClasses = {
  default: 'text-gray-500',
  primary: 'text-blue-600',
  white: 'text-white',
};

export function LoadingSpinner({
  size = 'md',
  className,
  label,
  variant = 'default',
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2
        className={cn('animate-spin', sizeClasses[size], variantClasses[variant])}
        aria-hidden="true"
      />
      {label && (
        <span className={cn('text-sm', variantClasses[variant])}>{label}</span>
      )}
    </div>
  );
}

// Dots loading animation
interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'default' | 'primary';
}

export function LoadingDots({ size = 'md', className, variant = 'default' }: LoadingDotsProps) {
  const dotSizes = {
    sm: 'h-1 w-1',
    md: 'h-2 w-2',
    lg: 'h-3 w-3',
  };

  const dotColors = {
    default: 'bg-gray-400',
    primary: 'bg-blue-600',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'animate-bounce rounded-full',
            dotSizes[size],
            dotColors[variant]
          )}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// Pulse loading animation
interface LoadingPulseProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingPulse({ size = 'md', className }: LoadingPulseProps) {
  const sizeStyles = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className={cn('relative', sizeStyles[size], className)}>
      <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-75" />
      <div className="relative flex h-full w-full items-center justify-center rounded-full bg-blue-600">
        <div className="h-1/2 w-1/2 rounded-full bg-white" />
      </div>
    </div>
  );
}

// Full page loading overlay
interface LoadingOverlayProps {
  isLoading: boolean;
  label?: string;
  className?: string;
}

export function LoadingOverlay({ isLoading, label, className }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-950/80',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="xl" variant="primary" />
        {label && <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>}
      </div>
    </div>
  );
}

// Inline loading state
interface LoadingInlineProps {
  isLoading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function LoadingInline({ isLoading, children, fallback, className }: LoadingInlineProps) {
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        {fallback || <LoadingSpinner size="sm" />}
      </div>
    );
  }

  return <>{children}</>;
}

export default LoadingSpinner;
