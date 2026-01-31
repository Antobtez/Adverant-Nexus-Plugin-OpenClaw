/**
 * Store Exports
 * Central export point for all Zustand stores
 */

// App Store - Global application state
export {
  useAppStore,
  useUser,
  useIsAuthenticated,
  useWsStatus,
  useQuota,
  useTheme,
  useActiveSection,
  type User,
  type Quota,
  type QuotaLimits,
  type WebSocketState,
  type ActiveSection,
  type ThemeMode,
} from './appStore';

// Session Store - Chat sessions and messages
export {
  useSessionStore,
  useSessions,
  useActiveSession,
  useSessionMessages,
  useIsAssistantTyping,
  type Session,
  type Message,
  type Attachment,
  type SkillExecution,
  type ChannelType,
  type MessageRole,
  type MessageStatus,
  type SkillExecutionStatus,
} from './sessionStore';

// Skill Store - Skills catalog and execution
export {
  useSkillStore,
  useSkills,
  useSelectedSkill,
  useSkillCategories,
  useFavoriteSkills,
  useCurrentExecution,
  type Skill,
  type SkillCategory,
  type SkillParameter,
  type SkillSchema,
  type SkillExecutionRecord,
  type SkillStats,
} from './skillStore';

// Channel Store - Multi-channel integration
export {
  useChannelStore,
  useChannels,
  useSelectedChannel,
  useConnectedChannels,
  useSetupWizard,
  CHANNEL_TYPE_INFO,
  type Channel,
  type ChannelConfig,
  type ChannelStats,
  type ConnectionStatus,
  type SessionScope,
  type SetupWizardStep,
  type SetupWizardState,
} from './channelStore';

// Cron Store - Cron job scheduling
export {
  useCronStore,
  useCronJobs,
  useSelectedCronJob,
  useCronEditor,
  useCronRunHistory,
  CRON_PRESETS,
  TIMEZONES,
  type CronJob,
  type CronJobStatus,
  type CronRunStatus,
  type CronRunRecord,
  type CronJobParams,
  type CronPreset,
  type CronEditorState,
} from './cronStore';
