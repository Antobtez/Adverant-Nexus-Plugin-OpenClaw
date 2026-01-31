# Cron System Architecture

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   REST API   │  │  WebSocket   │  │  Dashboard   │          │
│  │   Requests   │  │    Events    │  │      UI      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │            Cron API Routes (api/cron.ts)                  │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │  │
│  │  │ Create  │ │  List   │ │ Update  │ │ Delete  │  ...   │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘        │  │
│  └───────┼───────────┼───────────┼───────────┼──────────────┘  │
└──────────┼───────────┼───────────┼───────────┼─────────────────┘
           │           │           │           │
           ▼           ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         CronManager (cron/cron-manager.ts)               │   │
│  │  - CRUD operations      - Job validation                 │   │
│  │  - Enable/disable       - Statistics                     │   │
│  │  - List with filters    - Manual triggers                │   │
│  └────────┬────────────────────────┬─────────────────────────┘  │
│           │                        │                             │
│  ┌────────▼─────────┐     ┌────────▼─────────┐                 │
│  │  CronScheduler   │     │   CronHistory    │                 │
│  │  (scheduler.ts)  │     │   (history.ts)   │                 │
│  │                  │     │                  │                 │
│  │ - Parse cron     │     │ - Query history  │                 │
│  │ - Schedule jobs  │     │ - Statistics     │                 │
│  │ - Next run calc  │     │ - Analytics      │                 │
│  │ - Concurrency    │     │ - Timeline       │                 │
│  └────────┬─────────┘     └──────────────────┘                 │
│           │                                                      │
│  ┌────────▼─────────┐                                           │
│  │   CronExecutor   │                                           │
│  │  (executor.ts)   │                                           │
│  │                  │                                           │
│  │ - Execute skills │                                           │
│  │ - Retry logic    │                                           │
│  │ - Timeout        │                                           │
│  │ - Progress track │                                           │
│  └────────┬─────────┘                                           │
└───────────┼──────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Integration Layer                           │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ SkillExecutor  │  │   WebSocket    │  │     Database     │  │
│  │  (skills/)     │  │    Gateway     │  │   (PostgreSQL)   │  │
│  │                │  │  (gateway/)    │  │                  │  │
│  │ - Run skills   │  │ - Broadcast    │  │ - cron_jobs      │  │
│  │ - Validate     │  │   events       │  │ - skill_exec     │  │
│  │ - Track exec   │  │ - Real-time    │  │ - Persistence    │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Job Creation Flow
```
User Request → API → CronManager
                        ↓
                  Validate Cron Expression
                        ↓
                  Create DB Record
                        ↓
                  CronScheduler.scheduleJob()
                        ↓
                  Calculate Next Run
                        ↓
                  Register with node-cron
                        ↓
                  Return Job Details
```

### 2. Job Execution Flow
```
Cron Timer Triggers → CronScheduler
                           ↓
                    Check Concurrency Limit
                           ↓
                    Queue or Execute
                           ↓
                    CronManager.executeScheduledJob()
                           ↓
                    CronExecutor.executeJob()
                           ↓
                    SkillExecutor.execute()
                           ↓
                    WebSocket Broadcast (progress)
                           ↓
                    Store Result in DB
                           ↓
                    Update Job Statistics
                           ↓
                    WebSocket Broadcast (complete/failed)
                           ↓
                    Calculate Next Run
```

### 3. History Query Flow
```
User Request → API → CronHistory
                        ↓
                  Build SQL Query
                        ↓
                  Apply Filters
                        ↓
                  Query Database
                        ↓
                  Calculate Statistics
                        ↓
                  Return Results
```

## Database Schema

```sql
┌─────────────────────────────────────────────────────────────────┐
│                    openclaw.cron_jobs                            │
├─────────────────────────────────────────────────────────────────┤
│ job_id (PK)              UUID                                    │
│ user_id (FK)             UUID                                    │
│ organization_id (FK)     UUID                                    │
│ job_name                 VARCHAR(255)                            │
│ description              TEXT                                    │
│ schedule                 VARCHAR(100)  -- Cron expression        │
│ timezone                 VARCHAR(100)                            │
│ skill_name               VARCHAR(255)                            │
│ skill_params             JSONB                                   │
│ enabled                  BOOLEAN                                 │
│ paused_reason            TEXT                                    │
│ last_run                 TIMESTAMP                               │
│ last_status              VARCHAR(50)                             │
│ last_error               TEXT                                    │
│ next_run                 TIMESTAMP                               │
│ run_count                INTEGER                                 │
│ success_count            INTEGER                                 │
│ failure_count            INTEGER                                 │
│ max_retries              INTEGER                                 │
│ timeout_seconds          INTEGER                                 │
│ created_at               TIMESTAMP                               │
│ updated_at               TIMESTAMP                               │
│ deleted_at               TIMESTAMP                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ (linked via skill_name)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                openclaw.skill_executions                         │
├─────────────────────────────────────────────────────────────────┤
│ execution_id (PK)        UUID                                    │
│ session_id               UUID (NULL for cron)                    │
│ organization_id          UUID                                    │
│ skill_name               VARCHAR(255)                            │
│ skill_version            VARCHAR(50)                             │
│ skill_category           VARCHAR(100)                            │
│ input_params             JSONB                                   │
│ output_result            JSONB                                   │
│ status                   VARCHAR(50)                             │
│ execution_time_ms        INTEGER                                 │
│ tokens_used              INTEGER                                 │
│ cost_cents               INTEGER                                 │
│ error_message            TEXT                                    │
│ error_code               VARCHAR(100)                            │
│ error_stack              TEXT                                    │
│ retry_count              INTEGER                                 │
│ started_at               TIMESTAMP                               │
│ completed_at             TIMESTAMP                               │
│ executed_at              TIMESTAMP                               │
└─────────────────────────────────────────────────────────────────┘
```

## State Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cron Job States                             │
└─────────────────────────────────────────────────────────────────┘

     [Created]
        │
        ▼
    [Enabled] ◄──────┐
        │            │
        │            │ enable()
        ▼            │
   [Scheduled] ──────┘
        │
        │ (cron trigger)
        ▼
   [Running]
        │
        ├────► [Retrying] ──► (retry logic)
        │
        ├────► [Timeout] ──► [Failed]
        │
        ├────► [Failed]
        │
        ▼
   [Completed]
        │
        ▼
   (Update stats, calculate next run)
        │
        ▼
    [Scheduled] ──► (wait for next trigger)
        │
        │ disable()
        ▼
   [Disabled]
        │
        │ delete()
        ▼
   [Deleted]
```

## Concurrency Model

```
┌───────────────────────────────────────────────────────────────┐
│                    Job Execution Queue                         │
└───────────────────────────────────────────────────────────────┘

Incoming Jobs:
   Job A ──┐
   Job B ──┤
   Job C ──┤──► CronScheduler
   Job D ──┤       │
   Job E ──┘       │
                   ▼
            Check Concurrency
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
   Running < Max       Running = Max
         │                   │
         ▼                   ▼
    Execute Now         Add to Queue
         │                   │
         │                   │
    ┌────▼────┐         ┌────▼────┐
    │ Running │         │  Queue  │
    │ Jobs    │         │         │
    │ (max 10)│         │ [Job E] │
    │         │         │ [Job F] │
    │ [Job A] │         │ [Job G] │
    │ [Job B] │         └─────────┘
    │ [Job C] │              │
    │ [Job D] │              │
    └────┬────┘              │
         │                   │
         │ (job completes)   │
         ▼                   │
    Free Slot  ◄─────────────┘
         │
         ▼
    Process Queued Jobs
```

## Error Handling Flow

```
┌───────────────────────────────────────────────────────────────┐
│                     Error Handling                             │
└───────────────────────────────────────────────────────────────┘

Job Execution
     │
     ▼
Try Execute
     │
     ├───► Success ──► Update Stats ──► Done
     │
     ▼
  Failure
     │
     ▼
Check Retry Count
     │
     ├───► Max Retries Reached ──► Mark Failed ──► Notify
     │
     ▼
Retry < Max
     │
     ▼
Wait (Exponential Backoff)
     │
     │  Delay = min(1000 * 2^attempt, 30000)
     │
     ▼
Retry Execution
     │
     └───► (back to Try Execute)

Timeout Handling:
     │
     ▼
Start Timeout Timer
     │
     ├───► Job Completes ──► Cancel Timer
     │
     ▼
Timer Expires
     │
     ▼
Kill Execution
     │
     ▼
Mark as Timeout
     │
     ▼
Record Error ──► Retry Logic
```

## WebSocket Event Flow

```
┌───────────────────────────────────────────────────────────────┐
│                   WebSocket Broadcasting                       │
└───────────────────────────────────────────────────────────────┘

Job Event Occurs
     │
     ▼
Generate Event Payload
     │
     ▼
WebSocket Gateway
     │
     ├────► Broadcast to Organization Room
     │          │
     │          └──► org:{organizationId}
     │
     └────► Broadcast to User Room
                │
                └──► user:{userId}

Connected Clients Receive:
     │
     ├────► Dashboard UI Updates
     ├────► Mobile App Notifications
     └────► Monitoring Tools
```

## Component Responsibilities

| Component | Responsibilities | Dependencies |
|-----------|------------------|--------------|
| **CronScheduler** | Parse cron expressions, schedule jobs, manage concurrency | node-cron |
| **CronExecutor** | Execute skills, retry logic, timeout handling | SkillExecutor |
| **CronManager** | CRUD operations, job lifecycle, statistics | Scheduler, Executor, Database |
| **CronHistory** | Query history, analytics, cleanup | Database |
| **API Routes** | HTTP endpoints, authentication, request validation | Manager, History |
| **WebSocket** | Real-time event broadcasting | Gateway, Redis |

## Performance Characteristics

| Operation | Expected Latency | Notes |
|-----------|------------------|-------|
| Schedule Job | < 100ms | Includes DB write + scheduler registration |
| Validate Cron | < 10ms | Pure computation, no I/O |
| Execute Job | Varies | Depends on skill execution time |
| Query History | < 50ms | Indexed DB queries |
| List Jobs | < 50ms | Paginated, indexed |
| Manual Trigger | < 20ms | Async execution, immediate return |
| WebSocket Event | < 20ms | Redis pub/sub latency |

## Scalability Considerations

1. **Horizontal Scaling**: Multiple pods share Redis-backed WebSocket state
2. **Database**: Indexed queries, execution history cleanup
3. **Concurrency**: Configurable max concurrent jobs per pod
4. **Job Distribution**: Jobs run on pod where scheduled (stateful)
5. **Future**: Distributed cron with job stealing for load balancing

## Security Layers

```
┌───────────────────────────────────────────────────────────────┐
│                      Security Layers                           │
└───────────────────────────────────────────────────────────────┘

Request
   │
   ▼
[1] JWT Authentication
   │  Verify token, extract user context
   ▼
[2] Organization Isolation
   │  Ensure user belongs to organization
   ▼
[3] Authorization
   │  Check user permissions for operation
   ▼
[4] Input Validation
   │  Validate cron expression, parameters
   ▼
[5] Database RLS
   │  Row-level security policies
   ▼
[6] Rate Limiting
   │  Prevent abuse, quota enforcement
   ▼
Execute Operation
```

## Deployment Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                  Kubernetes Deployment                         │
└───────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Ingress (Istio)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
┌──────────────┐            ┌──────────────┐
│  Pod 1       │            │  Pod 2       │
│              │            │              │
│ ┌──────────┐ │            │ ┌──────────┐ │
│ │  Cron    │ │            │ │  Cron    │ │
│ │ System   │ │            │ │ System   │ │
│ └──────────┘ │            │ └──────────┘ │
│      │       │            │      │       │
└──────┼───────┘            └──────┼───────┘
       │                           │
       └──────────┬────────────────┘
                  │
      ┌───────────┴───────────┐
      ▼                       ▼
┌──────────────┐      ┌──────────────┐
│  PostgreSQL  │      │    Redis     │
│   Database   │      │   (Pub/Sub)  │
└──────────────┘      └──────────────┘
```
