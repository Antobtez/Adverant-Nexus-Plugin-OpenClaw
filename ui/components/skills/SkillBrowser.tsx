'use client';

/**
 * SkillBrowser Component - Main skills browser container
 *
 * Combines SkillCatalog and SkillDetailPanel in a two-panel layout
 * for browsing, searching, and executing skills.
 */

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TwoPanelLayout } from '@/components/layout/ThreePanelLayout';
import { SkillCatalog } from './SkillCatalog';
import { SkillDetailPanel } from './SkillDetailPanel';
import { useSkillStore } from '@/stores/skillStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useWebSocket } from '@/hooks/useWebSocket';

interface SkillBrowserProps {
  className?: string;
  onSkillExecuted?: (skillName: string, result: unknown) => void;
}

export function SkillBrowser({ className, onSkillExecuted }: SkillBrowserProps) {
  const { setCurrentExecution, addExecutionRecord } = useSkillStore();
  const { activeSessionId } = useSessionStore();
  const { executeSkill } = useWebSocket();

  // Handle skill execution
  const handleExecute = useCallback(
    (skillName: string, params: Record<string, unknown>) => {
      if (!activeSessionId) {
        console.warn('No active session for skill execution');
        return;
      }

      // Create execution record
      const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Set current execution state
      setCurrentExecution({
        executionId,
        skillName,
        status: 'running',
        input: params,
        startedAt: new Date(),
      });

      // Execute via WebSocket
      executeSkill(activeSessionId, skillName, params);
    },
    [activeSessionId, setCurrentExecution, executeSkill]
  );

  return (
    <div className={cn('h-full', className)}>
      <TwoPanelLayout
        leftPanel={<SkillCatalog className="h-full" />}
        rightPanel={
          <SkillDetailPanel onExecute={handleExecute} className="h-full" />
        }
        leftMinSize={30}
        leftDefaultSize={45}
      />
    </div>
  );
}

export default SkillBrowser;
