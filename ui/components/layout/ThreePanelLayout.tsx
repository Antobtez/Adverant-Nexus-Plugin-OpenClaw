'use client';

/**
 * ThreePanelLayout Component - Resizable three-panel layout
 * Uses react-resizable-panels for flexible panel sizing
 */

import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores';
import { GripVertical } from 'lucide-react';

interface ThreePanelLayoutProps {
  primaryPanel: React.ReactNode;
  mainPanel: React.ReactNode;
  detailPanel?: React.ReactNode;
  primaryPanelMinSize?: number;
  mainPanelMinSize?: number;
  detailPanelMinSize?: number;
  showDetailPanel?: boolean;
  className?: string;
}

// Resize handle component
function ResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle
      className={cn(
        'group relative flex w-1 items-center justify-center bg-gray-200 transition-colors hover:bg-blue-500 dark:bg-gray-700 dark:hover:bg-blue-500',
        className
      )}
    >
      <div className="absolute flex h-8 w-4 items-center justify-center rounded bg-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-600">
        <GripVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </div>
    </PanelResizeHandle>
  );
}

export function ThreePanelLayout({
  primaryPanel,
  mainPanel,
  detailPanel,
  primaryPanelMinSize = 15,
  mainPanelMinSize = 30,
  detailPanelMinSize = 15,
  showDetailPanel = true,
  className,
}: ThreePanelLayoutProps) {
  const {
    primaryPanelWidth,
    detailPanelWidth,
    isDetailPanelOpen,
    setPrimaryPanelWidth,
    setDetailPanelWidth,
  } = useAppStore();

  // Only show detail panel if both prop and state allow it
  const shouldShowDetail = showDetailPanel && isDetailPanelOpen && detailPanel;

  return (
    <div className={cn('flex h-full flex-1 overflow-hidden', className)}>
      <PanelGroup
        direction="horizontal"
        className="h-full"
        onLayout={(sizes) => {
          // Save panel sizes to store for persistence
          if (sizes[0] !== undefined) {
            // Convert percentage to pixels (approximate)
            setPrimaryPanelWidth(sizes[0]);
          }
          if (shouldShowDetail && sizes[2] !== undefined) {
            setDetailPanelWidth(sizes[2]);
          }
        }}
      >
        {/* Primary Panel (Left) - List/Navigation */}
        <Panel
          id="primary-panel"
          order={1}
          defaultSize={20}
          minSize={primaryPanelMinSize}
          maxSize={35}
          className="flex flex-col bg-white dark:bg-gray-900"
        >
          <div className="flex h-full flex-col overflow-hidden">{primaryPanel}</div>
        </Panel>

        <ResizeHandle />

        {/* Main Panel (Center) - Primary content */}
        <Panel
          id="main-panel"
          order={2}
          defaultSize={shouldShowDetail ? 50 : 80}
          minSize={mainPanelMinSize}
          className="flex flex-col bg-gray-50 dark:bg-gray-950"
        >
          <div className="flex h-full flex-col overflow-hidden">{mainPanel}</div>
        </Panel>

        {/* Detail Panel (Right) - Inspector/Preview */}
        {shouldShowDetail && (
          <>
            <ResizeHandle />
            <Panel
              id="detail-panel"
              order={3}
              defaultSize={30}
              minSize={detailPanelMinSize}
              maxSize={45}
              className="flex flex-col bg-white dark:bg-gray-900"
            >
              <div className="flex h-full flex-col overflow-hidden">{detailPanel}</div>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}

/**
 * TwoPanelLayout - Simplified layout without detail panel
 */
interface TwoPanelLayoutProps {
  primaryPanel: React.ReactNode;
  mainPanel: React.ReactNode;
  primaryPanelMinSize?: number;
  mainPanelMinSize?: number;
  className?: string;
}

export function TwoPanelLayout({
  primaryPanel,
  mainPanel,
  primaryPanelMinSize = 15,
  mainPanelMinSize = 50,
  className,
}: TwoPanelLayoutProps) {
  return (
    <div className={cn('flex h-full flex-1 overflow-hidden', className)}>
      <PanelGroup direction="horizontal" className="h-full">
        <Panel
          id="primary-panel"
          order={1}
          defaultSize={25}
          minSize={primaryPanelMinSize}
          maxSize={40}
          className="flex flex-col bg-white dark:bg-gray-900"
        >
          <div className="flex h-full flex-col overflow-hidden">{primaryPanel}</div>
        </Panel>

        <ResizeHandle />

        <Panel
          id="main-panel"
          order={2}
          defaultSize={75}
          minSize={mainPanelMinSize}
          className="flex flex-col bg-gray-50 dark:bg-gray-950"
        >
          <div className="flex h-full flex-col overflow-hidden">{mainPanel}</div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

/**
 * SinglePanelLayout - Full width layout
 */
interface SinglePanelLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function SinglePanelLayout({ children, className }: SinglePanelLayoutProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-1 flex-col overflow-hidden bg-white dark:bg-gray-900',
        className
      )}
    >
      {children}
    </div>
  );
}

export default ThreePanelLayout;
