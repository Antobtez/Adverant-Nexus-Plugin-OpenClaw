'use client';

/**
 * Tooltip Component - Hover tooltips using Radix UI
 */

import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export function TooltipProvider({
  children,
  delayDuration = 400,
  skipDelayDuration = 300,
  ...props
}: TooltipPrimitive.TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    >
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({ ...props }: TooltipPrimitive.TooltipProps) {
  return <TooltipPrimitive.Root {...props} />;
}

export function TooltipTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger className={cn(className)} {...props} />;
}

interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  variant?: 'default' | 'dark';
}

export function TooltipContent({
  className,
  sideOffset = 4,
  variant = 'dark',
  ...props
}: TooltipContentProps) {
  const variantClasses = {
    default:
      'bg-white text-gray-900 border border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
    dark: 'bg-gray-900 text-white dark:bg-gray-700',
  };

  return (
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md px-3 py-1.5 text-sm shadow-md',
        'animate-in fade-in-0 zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-2',
        'data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2',
        'data-[side=top]:slide-in-from-bottom-2',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

// Convenience component that wraps all parts
interface SimpleTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  disabled?: boolean;
  variant?: 'default' | 'dark';
}

export function SimpleTooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 400,
  disabled = false,
  variant = 'dark',
}: SimpleTooltipProps) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} variant={variant}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default Tooltip;
