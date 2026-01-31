/**
 * Components Index
 *
 * Main export file for all UI components.
 * Re-exports from individual component directories for convenient imports.
 */

// Layout components
export * from './layout';

// UI primitives
export * from './ui';

// Chat components
export * from './chat';
export { ChatInterface } from './chat';

// Skills components
export * from './skills';
export { SkillBrowser } from './skills';

// Channel components
export * from './channels';
export { ChannelManager } from './channels';

// Cron components
export * from './cron';
export { CronManager as CronEditor } from './cron'; // Alias for page.tsx compatibility

// Analytics components
export * from './analytics';
export { AnalyticsDashboard } from './analytics';

// Settings components
export * from './settings';
export { SettingsPanel } from './settings';
