'use client';

/**
 * TypingIndicator Component - Animated typing indicator
 * Shows when the assistant is generating a response
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  label?: string;
  showAvatar?: boolean;
  className?: string;
}

export function TypingIndicator({
  label = 'AI is typing',
  showAvatar = true,
  className,
}: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      {showAvatar && (
        <UserAvatar fallback="AI" variant="primary" size="sm" className="flex-shrink-0" />
      )}
      <div className="flex flex-col items-start">
        <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 dark:bg-gray-800">
          <div className="flex items-center gap-1">
            <TypingDot delay={0} />
            <TypingDot delay={150} />
            <TypingDot delay={300} />
          </div>
        </div>
        <span className="mt-1 text-xs text-gray-400">{label}</span>
      </div>
    </div>
  );
}

// Individual bouncing dot
function TypingDot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500"
      style={{
        animation: 'typing-bounce 1.4s ease-in-out infinite',
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

// Compact typing indicator (just dots, no avatar)
export function TypingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <TypingDot delay={0} />
      <TypingDot delay={150} />
      <TypingDot delay={300} />
    </div>
  );
}

// Add the keyframes to globals.css or inline style
export const typingIndicatorStyles = `
@keyframes typing-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}
`;

export default TypingIndicator;
