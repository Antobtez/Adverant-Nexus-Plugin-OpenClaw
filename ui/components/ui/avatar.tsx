'use client';

/**
 * Avatar Component - User/entity avatar with image and fallback
 */

import React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

export function Avatar({ className, size = 'md', ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

interface AvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {}

export function AvatarImage({ className, ...props }: AvatarImageProps) {
  return (
    <AvatarPrimitive.Image
      className={cn('aspect-square h-full w-full object-cover', className)}
      {...props}
    />
  );
}

interface AvatarFallbackProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {
  variant?: 'default' | 'muted' | 'primary';
}

export function AvatarFallback({ className, variant = 'default', ...props }: AvatarFallbackProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    muted: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-500',
    primary: 'bg-blue-600 text-white',
  };

  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex h-full w-full items-center justify-center font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

// Convenience component with all parts
interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'muted' | 'primary';
  className?: string;
}

export function UserAvatar({
  src,
  alt,
  fallback,
  size = 'md',
  variant = 'default',
  className,
}: UserAvatarProps) {
  // Generate fallback from alt text or fallback prop
  const fallbackText = fallback || (alt ? alt.charAt(0).toUpperCase() : '?');

  return (
    <Avatar size={size} className={className}>
      {src && <AvatarImage src={src} alt={alt} />}
      <AvatarFallback variant={variant}>{fallbackText}</AvatarFallback>
    </Avatar>
  );
}

// Avatar group for showing multiple avatars
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  className?: string;
}

export function AvatarGroup({ children, max = 4, className }: AvatarGroupProps) {
  const childArray = React.Children.toArray(children);
  const shown = childArray.slice(0, max);
  const remaining = childArray.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {shown.map((child, index) => (
        <div
          key={index}
          className="relative ring-2 ring-white dark:ring-gray-900"
          style={{ zIndex: shown.length - index }}
        >
          {child}
        </div>
      ))}
      {remaining > 0 && (
        <Avatar size="md" className="ring-2 ring-white dark:ring-gray-900">
          <AvatarFallback variant="muted">+{remaining}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export default Avatar;
