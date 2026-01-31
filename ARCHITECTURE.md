# OpenClaw Plugin - Technical Architecture

This document describes the technical architecture of the Nexus OpenClaw plugin, including system design, data flows, security model, and scaling strategies.

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Security Model](#security-model)
5. [Multi-Tenancy](#multi-tenancy)
6. [Scaling Strategy](#scaling-strategy)
7. [Database Schema](#database-schema)
8. [API Design](#api-design)
9. [WebSocket Protocol](#websocket-protocol)
10. [Error Handling](#error-handling)
11. [Monitoring & Observability](#monitoring--observability)
12. [Disaster Recovery](#disaster-recovery)

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│  (OpenAI SDK, Custom WebSocket Clients, Direct HTTP Clients)    │
└────────────────┬───────────────────────────┬────────────────────┘
                 │                           │
                 │ REST API                  │ WebSocket
                 │                           │
┌────────────────▼───────────────────────────▼────────────────────┐
│                    Nexus OpenClaw Plugin                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              API Gateway Layer                            │  │
│  │  • Request Logger                                        │  │
│  │  • Authentication Middleware                             │  │
│  │  • Rate Limiter                                          │  │
│  │  • Quota Enforcer                                        │  │
│  │  • Error Handler                                         │  │
│  └───────────────────┬──────────────────────────────────────┘  │
│                      │                                          │
│  ┌───────────────────▼──────────────────────────────────────┐  │
│  │           Session & Connection Manager                    │  │
│  │  • Session Lifecycle Management                          │  │
│  │  • WebSocket Connection Pool                             │  │
│  │  • Message History Storage                               │  │
│  └───────────────────┬──────────────────────────────────────┘  │
│                      │                                          │
│  ┌───────────────────▼──────────────────────────────────────┐  │
│  │              Skill Orchestrator                           │  │
│  │  • Skill Discovery                                       │  │
│  │  • Execution Engine                                      │  │
│  │  • Result Aggregation                                    │  │
│  └───────────────────┬──────────────────────────────────────┘  │
│                      │                                          │
└──────────────────────┼──────────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Nexus     │ │   Nexus     │ │   Nexus     │
│  GraphRAG   │ │ MageAgent   │ │    Auth     │
│             │ │             │ │             │
└─────────────┘ └─────────────┘ └─────────────┘

       ┌───────────────┴───────────────┐
       │                               │
       ▼                               ▼
┌─────────────┐                 ┌─────────────┐
│ PostgreSQL  │                 │    Redis    │
│  (Primary   │                 │  (Cache &   │
│   Storage)  │                 │Rate Limit)  │
└─────────────┘                 └─────────────┘
```

### Key Components

1. **API Gateway Layer**: HTTP/WebSocket entry point with middleware pipeline
2. **Session Manager**: Manages session lifecycle and message history
3. **Skill Orchestrator**: Executes skills and aggregates results
4. **Database Layer**: PostgreSQL for persistence, Redis for caching
5. **External Services**: Integration with Nexus GraphRAG, MageAgent, and Auth

## Component Architecture

### 1. API Gateway Layer

**Responsibilities**:
- Accept HTTP and WebSocket connections
- Authenticate requests via JWT or API keys
- Enforce rate limits and quotas
- Log requests and responses
- Handle errors gracefully

**Middleware Stack** (in order):

```typescript
app.use(requestLogger);           // Log all requests
app.use(requireAuth(authClient)); // Authenticate
app.use(rateLimiter(factory));    // Rate limit
app.use(quotaEnforcer(enforcer)); // Check quotas
// ... route handlers ...
app.use(notFoundHandler);         // 404 handler
app.use(errorHandler);            // Error handler
```

### 2. Session Manager

**Responsibilities**:
- Create, read, update, delete sessions
- Store session metadata and state
- Manage message history
- Handle session expiration
- Enforce multi-tenant isolation

**Storage Strategy**:
- **Hot Data** (Redis): Active sessions, recent messages (TTL: 24h)
- **Cold Data** (PostgreSQL): All sessions, full message history (retention: 30 days)

**Session Lifecycle**:

```
CREATE → ACTIVE → [INACTIVE] → EXPIRED → DELETED
                      ↓
                  (reactivate)
                      ↓
                   ACTIVE
```

### 3. Skill Orchestrator

**Responsibilities**:
- Discover available skills
- Route skill requests
- Execute skills with timeout
- Aggregate results
- Handle skill failures

**Execution Flow**:

```
1. Receive skill request
2. Validate skill name and parameters
3. Check skill permissions (tier-based)
4. Execute skill with timeout
5. Record metrics (duration, status)
6. Return result or error
```

### 4. Database Services

#### PostgreSQL Service

**Features**:
- Connection pooling (max 20 connections)
- Query execution helpers (query, queryOne, queryMany)
- Transaction support with rollback
- Named parameter queries
- Health checks

**Connection Pool Configuration**:

```typescript
{
  max: 20,                      // Max connections
  idleTimeoutMillis: 30000,     // 30s idle timeout
  connectionTimeoutMillis: 5000 // 5s connection timeout
}
```

#### Redis Service

**Features**:
- Key namespacing (`openclaw:*`)
- TTL helpers for expiration
- Pub/Sub support
- Command metrics
- Automatic retry logic

**Key Patterns**:

```
openclaw:session:{sessionId}                    # Session data
openclaw:messages:{sessionId}                   # Message list
openclaw:org:sessions:{organizationId}          # Org session set
openclaw:quota:{organizationId}:{type}:{month}  # Quota usage
openclaw:rate_limit:{tier}:{type}:{key}         # Rate limit buckets
```

## Data Flow

### REST API Request Flow

```
1. Client → HTTP Request
2. Request Logger → Log request details
3. Auth Middleware → Validate JWT/API key
4. Rate Limiter → Check rate limit
5. Quota Enforcer → Check quota
6. Route Handler → Process request
7. Session Manager → Get/update session
8. Skill Orchestrator → Execute skill (if needed)
9. Response → Send to client
10. Metrics → Record duration, status
```

### WebSocket Message Flow

```
1. Client → WebSocket Connection
2. Auth → Validate token in query params
3. Session Manager → Get session
4. Rate Limiter → Check connection limit
5. Connection Pool → Add connection
6. Client → Send message
7. Rate Limiter → Check message rate limit
8. Message Handler → Process message
9. Skill Orchestrator → Execute skill
10. Response → Stream chunks to client
11. Session Manager → Store message
12. Metrics → Record metrics
```

### Skill Execution Flow

```
┌──────────────┐
│ User Message │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Parse Skill Request  │
│ (skillName, params)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Check Tier           │
│ Permissions          │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Route to External    │
│ Service:             │
│ • GraphRAG           │
│ • MageAgent          │
│ • Custom Skill       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Execute with Timeout │
│ (30s default)        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Aggregate Results    │
│ (if multi-skill)     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Return to Client     │
└──────────────────────┘
```

## Security Model

### Authentication

**JWT Authentication**:
- Issued by Nexus Auth service
- Contains: userId, organizationId, tier, expiration
- Validated on every request
- Attached to request object for downstream use

**API Key Authentication**:
- Alternative to JWT for programmatic access
- Stored hashed in database
- Scoped to organization
- Can be revoked independently

### Authorization

**Tier-Based Access**:
- Open Source: Basic features only
- Teams: Advanced features + priority support
- Government: All features + dedicated resources

**Organization Isolation**:
- All queries scoped by `organization_id`
- Row-level security in PostgreSQL
- Redis keys include organization ID
- No cross-organization data access

### Data Protection

**In Transit**:
- TLS 1.3 for all HTTP/WebSocket connections
- Certificate validation enforced
- HTTPS redirect from HTTP

**At Rest**:
- PostgreSQL encryption at rest
- Redis password authentication
- Secrets stored in Kubernetes secrets
- No plaintext credentials in code

**Sensitive Data Sanitization**:
- Remove passwords, tokens from logs
- Redact sensitive fields in error responses
- Mask API keys in logs

## Multi-Tenancy

### Isolation Levels

**Database Isolation**:
- All tables include `organization_id` column
- All queries filtered by organization ID
- Foreign keys enforce referential integrity within organization

**Redis Isolation**:
- Key namespacing: `openclaw:{organizationId}:*`
- Separate rate limit buckets per organization
- Quota tracking per organization

**Session Isolation**:
- Sessions belong to single organization
- Message history isolated by session
- No cross-session data access

### Resource Quotas

**Per-Tier Quotas** (monthly):

```typescript
{
  open_source: {
    sessions: 100,
    messages: 10000,
    concurrent_sessions: 5,
    skills_per_session: 10
  },
  teams: {
    sessions: 1000,
    messages: 100000,
    concurrent_sessions: 20,
    skills_per_session: 50
  },
  government: {
    sessions: 10000,
    messages: 1000000,
    concurrent_sessions: 100,
    skills_per_session: 200
  }
}
```

**Quota Enforcement**:
- Checked before operation
- Tracked in Redis with TTL (35 days)
- Warning emitted at 80% usage
- Blocked at 100% usage

## Scaling Strategy

### Horizontal Scaling

**Stateless Design**:
- No server-side session state (stored in Redis/PostgreSQL)
- Any pod can handle any request
- Load balanced via Kubernetes Service

**WebSocket Scaling**:
- Sticky sessions via client-side session ID
- Redis pub/sub for cross-pod messaging
- Connection count tracked per pod

**Deployment**:

```yaml
replicas: 3  # Minimum for HA
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

### Database Scaling

**Read Replicas**:
- Route read queries to replicas
- Write queries to primary
- Eventual consistency acceptable for message history

**Connection Pooling**:
- 20 connections per pod
- 3 pods = 60 total connections
- Monitor with `database_connections_active` metric

**Query Optimization**:
- Indexes on `organization_id`, `session_id`
- Partitioning by month for message history
- VACUUM schedule for cleanup

### Redis Scaling

**Redis Cluster**:
- Shard by organization ID
- 3 master nodes
- 3 replica nodes

**Eviction Policy**:
- `allkeys-lru` for cache keys
- `volatile-ttl` for rate limit keys

## Database Schema

### Tables

#### openclaw_sessions

```sql
CREATE TABLE openclaw_sessions (
  session_id UUID PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  CONSTRAINT fk_organization FOREIGN KEY (organization_id)
    REFERENCES organizations(organization_id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_org ON openclaw_sessions(organization_id);
CREATE INDEX idx_sessions_status ON openclaw_sessions(status);
CREATE INDEX idx_sessions_expires ON openclaw_sessions(expires_at);
```

#### openclaw_messages

```sql
CREATE TABLE openclaw_messages (
  message_id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  CONSTRAINT fk_session FOREIGN KEY (session_id)
    REFERENCES openclaw_sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_session ON openclaw_messages(session_id);
CREATE INDEX idx_messages_timestamp ON openclaw_messages(timestamp);

-- Partition by month for performance
CREATE TABLE openclaw_messages_2024_01 PARTITION OF openclaw_messages
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### openclaw_skill_executions

```sql
CREATE TABLE openclaw_skill_executions (
  execution_id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  skill_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_session FOREIGN KEY (session_id)
    REFERENCES openclaw_sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX idx_executions_session ON openclaw_skill_executions(session_id);
CREATE INDEX idx_executions_skill ON openclaw_skill_executions(skill_name);
CREATE INDEX idx_executions_status ON openclaw_skill_executions(status);
```

## API Design

### RESTful Principles

- **Resource-based URLs**: `/api/v1/sessions`, `/api/v1/messages`
- **HTTP methods**: GET, POST, PUT, DELETE
- **Status codes**: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests, 500 Internal Server Error
- **JSON responses**: All responses in JSON format
- **Versioning**: URL-based versioning (`/api/v1/`)

### OpenAI Compatibility

**Chat Completions API**:

```http
POST /api/v1/chat/completions
Content-Type: application/json

{
  "model": "claude-sonnet-4.5",
  "messages": [...],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false
}
```

**Differences from OpenAI**:
- Model name: `claude-*` instead of `gpt-*`
- Additional fields: `sessionId`, `skillName`
- Extended metadata support

## WebSocket Protocol

### Message Types

#### Client → Server

```json
{
  "type": "message",
  "content": "Hello, Claude!",
  "metadata": {
    "skillName": "search",
    "channelType": "slack"
  }
}
```

#### Server → Client

```json
{
  "type": "message",
  "messageId": "msg-123",
  "sessionId": "session-456",
  "role": "assistant",
  "content": "Hello! How can I help?",
  "timestamp": "2024-01-31T12:00:00Z"
}
```

#### Streaming

```json
{
  "type": "stream",
  "chunk": "partial response...",
  "done": false
}
```

#### Error

```json
{
  "type": "error",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded",
  "retryAfter": 60
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "timestamp": "2024-01-31T12:00:00Z"
  }
}
```

### Error Codes

- `UNAUTHORIZED`: Missing or invalid credentials
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Rate limit hit
- `QUOTA_EXCEEDED`: Quota exhausted
- `INTERNAL_SERVER_ERROR`: Unexpected error

### Error Recovery

**Retry Logic**:
- Exponential backoff for transient errors
- Circuit breaker for external service failures
- Graceful degradation when possible

## Monitoring & Observability

### Metrics

**Golden Signals**:
- **Latency**: p50, p95, p99 response times
- **Traffic**: Requests per second
- **Errors**: Error rate (percentage)
- **Saturation**: Resource utilization

### Logging

**Structured Logs** (JSON):

```json
{
  "level": "info",
  "message": "Request completed",
  "requestId": "req-123",
  "userId": "user-456",
  "organizationId": "org-789",
  "duration": 150,
  "statusCode": 200,
  "timestamp": "2024-01-31T12:00:00Z"
}
```

### Tracing

**Distributed Tracing**:
- Request ID propagated across services
- Correlation ID for multi-service requests
- Span tracking for skill execution

## Disaster Recovery

### Backup Strategy

**PostgreSQL**:
- Daily full backups
- Continuous WAL archiving
- Point-in-time recovery (PITR) capability
- 30-day retention

**Redis**:
- RDB snapshots every 6 hours
- AOF persistence for durability
- Replica for high availability

### Recovery Procedures

**Database Failure**:
1. Promote read replica to primary
2. Update application connection string
3. Restore from backup if needed

**Service Failure**:
1. Kubernetes auto-restart failed pods
2. Rolling deployment to healthy version
3. Manual intervention if persistent

**Data Loss**:
1. Restore PostgreSQL from latest backup
2. Replay WAL logs to recover recent data
3. Notify affected users

---

**Document Version**: 1.0
**Last Updated**: 2024-01-31
**Owner**: Adverant Engineering Team
