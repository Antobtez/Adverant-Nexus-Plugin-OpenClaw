# OpenClaw Cron Job System

The OpenClaw cron job system enables users to schedule automated skill executions using cron expressions. This allows for powerful automation workflows such as daily reports, periodic data syncs, scheduled notifications, and more.

## Architecture

The cron system consists of four main components:

### 1. CronScheduler (`cron-scheduler.ts`)
- Parses and validates cron expressions
- Schedules jobs using node-cron
- Manages job lifecycle (start, stop, pause, resume)
- Handles timezone conversion
- Controls concurrency limits
- Calculates next run times

### 2. CronExecutor (`cron-executor.ts`)
- Executes scheduled skills
- Implements retry logic (max 3 retries with exponential backoff)
- Handles timeouts (default 5 minutes)
- Tracks execution progress
- Stores results in database
- Emits WebSocket events

### 3. CronManager (`cron-manager.ts`)
- CRUD operations for cron jobs
- Job validation and creation
- Update and reschedule jobs
- Enable/disable jobs
- List jobs with filtering
- Trigger manual runs
- Load active jobs on startup

### 4. CronHistory (`cron-history.ts`)
- Records all job executions
- Stores success/failure status
- Logs execution duration and errors
- Provides execution history queries
- Generates statistics and analytics
- Execution timeline visualization

## Database Schema

The system uses two main tables:

### `openclaw.cron_jobs`
Stores cron job configuration:
- `job_id` - UUID primary key
- `user_id`, `organization_id` - Multi-tenant isolation
- `job_name`, `description` - Job metadata
- `schedule` - Cron expression (5 or 6 parts)
- `timezone` - Timezone for schedule evaluation
- `skill_name`, `skill_params` - Skill to execute
- `enabled`, `paused_reason` - Job status
- `last_run`, `next_run` - Execution tracking
- `run_count`, `success_count`, `failure_count` - Statistics
- `max_retries`, `timeout_seconds` - Execution limits

### `openclaw.skill_executions`
Stores execution history (reused from skill system):
- `execution_id` - UUID primary key
- `organization_id` - Multi-tenant isolation
- `skill_name`, `input_params` - What was executed
- `status`, `execution_time_ms` - Execution result
- `error_message`, `error_code` - Error details
- `retry_count` - Number of retry attempts
- `started_at`, `completed_at` - Timestamps

## API Endpoints

### Create Cron Job
```http
POST /openclaw/api/v1/cron
Content-Type: application/json
Authorization: Bearer <token>

{
  "jobName": "Daily GraphRAG Search",
  "description": "Search for new AI research papers daily",
  "schedule": "0 9 * * *",
  "timezone": "America/New_York",
  "skillName": "graphrag-search",
  "skillParams": {
    "query": "latest AI research",
    "limit": 10
  },
  "maxRetries": 3,
  "timeoutSeconds": 300
}
```

### List Cron Jobs
```http
GET /openclaw/api/v1/cron?enabled=true&limit=50&offset=0
Authorization: Bearer <token>
```

### Get Cron Job Details
```http
GET /openclaw/api/v1/cron/:id
Authorization: Bearer <token>
```

### Update Cron Job
```http
PUT /openclaw/api/v1/cron/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "schedule": "0 10 * * *",
  "enabled": true
}
```

### Delete Cron Job
```http
DELETE /openclaw/api/v1/cron/:id
Authorization: Bearer <token>
```

### Trigger Manual Run
```http
POST /openclaw/api/v1/cron/:id/run
Authorization: Bearer <token>
```

### Get Execution History
```http
GET /openclaw/api/v1/cron/:id/history?limit=50&offset=0
Authorization: Bearer <token>
```

### Get Job Statistics
```http
GET /openclaw/api/v1/cron/:id/stats
Authorization: Bearer <token>
```

## Cron Expression Format

### Standard 5-part Cron
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

### Extended 6-part Cron (with seconds)
```
┌───────────── second (0 - 59)
│ ┌───────────── minute (0 - 59)
│ │ ┌───────────── hour (0 - 23)
│ │ │ ┌───────────── day of month (1 - 31)
│ │ │ │ ┌───────────── month (1 - 12)
│ │ │ │ │ ┌───────────── day of week (0 - 6)
│ │ │ │ │ │
│ │ │ │ │ │
* * * * * *
```

### Common Examples

```bash
# Every day at 9:00 AM
0 9 * * *

# Every Monday at 8:00 AM
0 8 * * 1

# Every 15 minutes
*/15 * * * *

# Every hour at minute 0
0 * * * *

# Every day at midnight
0 0 * * *

# First day of every month at noon
0 12 1 * *

# Every weekday at 6:00 PM
0 18 * * 1-5

# Every 30 seconds (6-part cron)
*/30 * * * * *
```

## Usage Examples

### 1. Daily Report Generation
```typescript
// Schedule daily report at 9 AM EST
const job = await cronManager.createCronJob({
  userId: 'user-123',
  organizationId: 'org-456',
  jobName: 'Daily Sales Report',
  description: 'Generate and email daily sales report',
  schedule: '0 9 * * *',
  timezone: 'America/New_York',
  skillName: 'generate-report',
  skillParams: {
    reportType: 'sales',
    format: 'pdf',
    recipients: ['manager@company.com']
  }
});
```

### 2. Periodic Data Sync
```typescript
// Sync data every 6 hours
const job = await cronManager.createCronJob({
  userId: 'user-123',
  organizationId: 'org-456',
  jobName: 'CRM Data Sync',
  description: 'Sync customer data from CRM',
  schedule: '0 */6 * * *',
  timezone: 'UTC',
  skillName: 'crm-sync',
  skillParams: {
    source: 'salesforce',
    target: 'database'
  },
  timeoutSeconds: 600 // 10 minutes
});
```

### 3. Monitoring and Alerts
```typescript
// Check system health every 5 minutes
const job = await cronManager.createCronJob({
  userId: 'user-123',
  organizationId: 'org-456',
  jobName: 'Health Check Monitor',
  description: 'Monitor system health and send alerts',
  schedule: '*/5 * * * *',
  timezone: 'UTC',
  skillName: 'health-check',
  skillParams: {
    endpoints: ['api', 'database', 'redis'],
    alertChannel: 'slack'
  },
  maxRetries: 1 // Don't retry health checks
});
```

### 4. Scheduled Notifications
```typescript
// Send weekly summary every Friday at 5 PM
const job = await cronManager.createCronJob({
  userId: 'user-123',
  organizationId: 'org-456',
  jobName: 'Weekly Summary Email',
  description: 'Send weekly activity summary',
  schedule: '0 17 * * 5',
  timezone: 'America/Los_Angeles',
  skillName: 'send-email',
  skillParams: {
    template: 'weekly-summary',
    recipients: ['team@company.com']
  }
});
```

## WebSocket Events

The cron system emits WebSocket events for real-time updates:

### Job Started
```typescript
socket.on('cron.triggered', (data) => {
  console.log(`Job ${data.jobName} started at ${data.startTime}`);
});
```

### Job Progress
```typescript
socket.on('skill.progress', (data) => {
  console.log(`Job progress: ${data.progress.stage} - ${data.progress.message}`);
});
```

### Job Completed
```typescript
socket.on('cron.completed', (data) => {
  console.log(`Job ${data.jobName} completed successfully`);
  console.log('Result:', data.result);
});
```

### Job Failed
```typescript
socket.on('cron.failed', (data) => {
  console.error(`Job ${data.jobName} failed: ${data.error.message}`);
  console.log('Retry attempt:', data.retryAttempt);
});
```

## Integration with Skills

Cron jobs execute skills from the skill registry. Any registered skill can be scheduled:

```typescript
// Example: GraphRAG search skill
await cronManager.createCronJob({
  jobName: 'Daily Research Digest',
  schedule: '0 8 * * *',
  skillName: 'graphrag-search',
  skillParams: {
    query: 'AI advancements',
    limit: 5
  }
});

// Example: MageAgent task
await cronManager.createCronJob({
  jobName: 'Nightly Data Analysis',
  schedule: '0 2 * * *',
  skillName: 'mageagent-task',
  skillParams: {
    taskType: 'data-analysis',
    description: 'Analyze daily metrics'
  }
});

// Example: File processing
await cronManager.createCronJob({
  jobName: 'Process Uploaded Documents',
  schedule: '*/30 * * * *', // Every 30 minutes
  skillName: 'file-process',
  skillParams: {
    directory: '/uploads',
    processType: 'extract'
  }
});
```

## Timezone Support

All cron jobs support timezone-aware scheduling:

1. **User timezone** - Schedule in user's local timezone
2. **UTC storage** - All times stored in UTC in database
3. **Automatic conversion** - Scheduler handles timezone conversion

```typescript
// Schedule for 9 AM Eastern Time
const job = await cronManager.createCronJob({
  schedule: '0 9 * * *',
  timezone: 'America/New_York',
  // ...
});

// Schedule for 9 AM Pacific Time
const job = await cronManager.createCronJob({
  schedule: '0 9 * * *',
  timezone: 'America/Los_Angeles',
  // ...
});
```

## Error Handling

The system includes comprehensive error handling:

### Retry Logic
- Automatic retries for failed jobs (configurable, default 3)
- Exponential backoff between retries
- Retry count tracked in database

### Timeout Handling
- Configurable timeout per job (default 5 minutes)
- Jobs exceeding timeout are marked as 'timeout'
- Timeout recorded in execution history

### Error Tracking
- Full error messages and stack traces stored
- Error code classification
- Failed job statistics
- WebSocket events for failures

## Performance Considerations

### Concurrency Control
- Maximum concurrent jobs limit (default 10)
- Job queuing when limit reached
- Prevents system overload

### Database Optimization
- Indexed queries for fast lookups
- Execution history cleanup (default 90 days)
- Efficient statistics queries

### Resource Management
- Skill execution timeout enforcement
- Memory-efficient job scheduling
- Graceful shutdown handling

## Monitoring and Analytics

### Job Statistics
```typescript
const stats = await cronManager.getCronJobStats(jobId, organizationId);

console.log({
  totalRuns: stats.total_runs,
  successRate: stats.success_rate,
  averageDuration: stats.average_duration_ms,
  healthStatus: stats.health_status // 'healthy' | 'degraded' | 'unhealthy'
});
```

### Execution History
```typescript
const history = await cronHistory.getExecutionHistory({
  jobId,
  organizationId,
  limit: 50,
  status: 'failed' // Filter by status
});

console.log('Failed executions:', history.executions);
```

### Organization Analytics
```typescript
const orgStats = await cronHistory.getOrganizationStats(organizationId, 30);

console.log({
  totalExecutions: orgStats.totalExecutions,
  successRate: orgStats.successfulExecutions / orgStats.totalExecutions,
  topJobs: orgStats.jobStats
});
```

## Startup Behavior

On server startup, the cron manager:

1. Loads all active jobs from database
2. Validates cron expressions
3. Calculates next run times
4. Registers jobs with scheduler
5. Starts enabled jobs

### Auto-Recovery
If enabled in config, the system can resume missed jobs:
```typescript
const config = {
  enableAutoRecovery: true,
  // Resume jobs that should have run during downtime
};
```

## Testing

### Manual Job Trigger
Test a cron job without waiting for schedule:
```typescript
await cronManager.triggerManualRun(jobId, organizationId);
```

### Validation
Validate cron expression before creating job:
```typescript
const validation = cronScheduler.validateCronExpression('0 9 * * *');
if (validation.valid) {
  console.log('Next 5 runs:', validation.nextRuns);
}
```

## Security

### Multi-Tenant Isolation
- All jobs scoped to organization
- Row-level security in database
- User-specific job listings

### Authentication
- JWT-based API authentication
- WebSocket connection authentication
- Organization-level access control

### Rate Limiting
- Per-organization job limits
- Execution quota enforcement
- Resource usage tracking

## Best Practices

1. **Use descriptive job names** - Make jobs easy to identify
2. **Set appropriate timeouts** - Match timeout to expected execution time
3. **Monitor job health** - Check success rates regularly
4. **Clean up old jobs** - Delete unused jobs to reduce clutter
5. **Test before scheduling** - Use manual trigger to test job first
6. **Use UTC for consistency** - Unless user timezone is critical
7. **Handle failures gracefully** - Implement error notifications
8. **Document job purpose** - Use description field

## Troubleshooting

### Job Not Executing
1. Check if job is enabled
2. Verify cron expression is valid
3. Check timezone settings
4. Review job statistics for errors

### Failed Executions
1. Check execution history for error messages
2. Verify skill parameters are correct
3. Test skill execution manually
4. Review timeout settings

### Performance Issues
1. Check concurrent job count
2. Review execution durations
3. Optimize skill implementations
4. Adjust timeout limits

## Future Enhancements

- Job dependencies (run after another job)
- Conditional execution (run if X condition met)
- Job templates for common use cases
- Bulk job operations
- Job execution visualization
- Advanced scheduling (e.g., "last Friday of month")
- Job priority levels
- Resource allocation per job
