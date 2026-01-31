# OpenClaw Plugin - Quick Start Guide

Get up and running with OpenClaw in 5 minutes!

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 20+ installed
- ✅ PostgreSQL 14+ running
- ✅ Redis 6+ running
- ✅ Access to Nexus services (Auth, GraphRAG, MageAgent)

## Step 1: Clone Repository

```bash
git clone https://github.com/adverant/Adverant-Nexus-Plugin-OpenClaw.git
cd Adverant-Nexus-Plugin-OpenClaw/services/nexus-openclaw
```

## Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages including:
- Express for HTTP server
- ws for WebSocket support
- PostgreSQL and Redis clients
- Winston for logging
- Prometheus client for metrics

## Step 3: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Server
PORT=9090
NODE_ENV=development

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=nexus
POSTGRES_USER=nexus
POSTGRES_PASSWORD=your-secure-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Nexus Services
NEXUS_AUTH_URL=http://localhost:9091
NEXUS_GRAPHRAG_URL=http://localhost:9092
NEXUS_MAGEAGENT_URL=http://localhost:9093

# Session
SESSION_TTL=86400  # 24 hours
```

## Step 4: Initialize Database

Run migrations to create tables:

```bash
npm run migrate
```

This creates:
- `openclaw_sessions` table
- `openclaw_messages` table
- `openclaw_skill_executions` table

## Step 5: Start the Server

```bash
npm run dev
```

You should see:

```
[INFO] Connecting to database...
[INFO] Database connection established
[INFO] Connecting to Redis...
[INFO] Redis connection established
[INFO] OpenClaw server listening on port 9090
[INFO] WebSocket server ready
[INFO] Health checks available at /health
```

## Step 6: Verify Installation

### Check Health

```bash
curl http://localhost:9090/health
```

Expected response:

```json
{
  "status": "healthy",
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database is reachable"
    },
    "redis": {
      "status": "pass",
      "message": "Redis is reachable"
    }
  },
  "timestamp": "2024-01-31T12:00:00Z",
  "uptime": 5
}
```

### Check Metrics

```bash
curl http://localhost:9090/metrics
```

You should see Prometheus metrics including:
- `http_requests_total`
- `sessions_active`
- `database_connections_active`

## Step 7: Create Your First Session

### Get Authentication Token

First, authenticate with Nexus Auth to get a JWT token:

```bash
curl -X POST http://localhost:9091/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

Save the JWT token from the response.

### Create Session

```bash
curl -X POST http://localhost:9090/api/v1/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "project": "quickstart",
      "environment": "development"
    }
  }'
```

Response:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "organizationId": "org-123",
  "userId": "user-456",
  "tier": "open_source",
  "createdAt": "2024-01-31T12:00:00Z",
  "expiresAt": "2024-02-01T12:00:00Z",
  "status": "active"
}
```

Save the `sessionId` for the next step.

## Step 8: Send Your First Message

### Using REST API

```bash
curl -X POST http://localhost:9090/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4.5",
    "sessionId": "YOUR_SESSION_ID",
    "messages": [
      {
        "role": "user",
        "content": "Hello, Claude! What can you help me with?"
      }
    ]
  }'
```

Response:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1706702400,
  "model": "claude-sonnet-4.5",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm Claude, an AI assistant. I can help you with..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 50,
    "total_tokens": 65
  }
}
```

### Using WebSocket

Create `test-websocket.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>OpenClaw WebSocket Test</title>
</head>
<body>
  <h1>OpenClaw WebSocket Test</h1>

  <div>
    <label>Session ID:</label>
    <input type="text" id="sessionId" value="YOUR_SESSION_ID" style="width: 400px">
  </div>

  <div>
    <label>Token:</label>
    <input type="text" id="token" value="YOUR_JWT_TOKEN" style="width: 400px">
  </div>

  <div>
    <button onclick="connect()">Connect</button>
    <button onclick="disconnect()">Disconnect</button>
  </div>

  <div>
    <label>Message:</label>
    <input type="text" id="message" value="Hello, Claude!" style="width: 400px">
    <button onclick="sendMessage()">Send</button>
  </div>

  <div>
    <h3>Output:</h3>
    <pre id="output" style="background: #f0f0f0; padding: 10px; height: 300px; overflow-y: auto;"></pre>
  </div>

  <script>
    let ws = null;

    function log(message) {
      const output = document.getElementById('output');
      output.textContent += message + '\n';
      output.scrollTop = output.scrollHeight;
    }

    function connect() {
      const sessionId = document.getElementById('sessionId').value;
      const token = document.getElementById('token').value;

      ws = new WebSocket(`ws://localhost:9090/ws?sessionId=${sessionId}&token=${token}`);

      ws.onopen = () => {
        log('[Connected]');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        log('[Received] ' + JSON.stringify(data, null, 2));
      };

      ws.onerror = (error) => {
        log('[Error] ' + error);
      };

      ws.onclose = () => {
        log('[Disconnected]');
      };
    }

    function disconnect() {
      if (ws) {
        ws.close();
        ws = null;
      }
    }

    function sendMessage() {
      if (!ws) {
        alert('Not connected');
        return;
      }

      const message = document.getElementById('message').value;
      const payload = {
        type: 'message',
        content: message
      };

      ws.send(JSON.stringify(payload));
      log('[Sent] ' + message);
    }
  </script>
</body>
</html>
```

Open `test-websocket.html` in your browser and:
1. Enter your session ID and JWT token
2. Click "Connect"
3. Type a message and click "Send"
4. See the response in the output area

## Step 9: Try Advanced Features

### Execute a Skill

```bash
curl -X POST http://localhost:9090/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4.5",
    "sessionId": "YOUR_SESSION_ID",
    "messages": [
      {
        "role": "user",
        "content": "Search for information about TypeScript"
      }
    ],
    "metadata": {
      "skillName": "search"
    }
  }'
```

### Stream Responses

```bash
curl -X POST http://localhost:9090/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4.5",
    "sessionId": "YOUR_SESSION_ID",
    "messages": [
      {
        "role": "user",
        "content": "Tell me a story"
      }
    ],
    "stream": true
  }' \
  --no-buffer
```

### Get Message History

```bash
curl http://localhost:9090/api/v1/sessions/YOUR_SESSION_ID/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:

```json
{
  "messages": [
    {
      "messageId": "msg-1",
      "role": "user",
      "content": "Hello, Claude!",
      "timestamp": "2024-01-31T12:00:00Z"
    },
    {
      "messageId": "msg-2",
      "role": "assistant",
      "content": "Hello! How can I help you?",
      "timestamp": "2024-01-31T12:00:01Z"
    }
  ]
}
```

## Step 10: Monitor Your Application

### View Metrics

Open Prometheus metrics endpoint:

```bash
curl http://localhost:9090/metrics | grep openclaw
```

Key metrics to watch:
- `http_requests_total` - Total requests
- `http_request_duration_seconds` - Request latency
- `sessions_active` - Active sessions
- `skill_executions_total` - Skill execution count

### View Logs

Logs are written to:
- Console (development)
- `logs/combined-*.log` (production)
- `logs/error-*.log` (errors only)

Example log entry:

```json
{
  "level": "info",
  "message": "Request completed",
  "requestId": "req-123",
  "method": "POST",
  "url": "/api/v1/chat/completions",
  "statusCode": 200,
  "duration": 150,
  "timestamp": "2024-01-31T12:00:00Z"
}
```

## Common Issues

### Cannot Connect to Database

**Error**: `Failed to connect to database`

**Solution**:
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify credentials
psql -h localhost -U nexus -d nexus

# Check .env configuration
cat .env | grep POSTGRES
```

### Cannot Connect to Redis

**Error**: `Failed to connect to Redis`

**Solution**:
```bash
# Check if Redis is running
redis-cli ping

# Verify password
redis-cli -a your-redis-password ping

# Check .env configuration
cat .env | grep REDIS
```

### Authentication Failed

**Error**: `401 Unauthorized`

**Solution**:
- Verify JWT token is valid and not expired
- Check token is included in `Authorization: Bearer <token>` header
- Ensure Nexus Auth service is running

### Rate Limit Exceeded

**Error**: `429 Too Many Requests`

**Solution**:
- Wait for rate limit window to reset (check `Retry-After` header)
- Upgrade to higher tier for more capacity
- Implement client-side rate limiting

## Next Steps

Now that you have OpenClaw running:

1. **Read the Documentation**: [README.md](./README.md) for complete API reference
2. **Explore Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
3. **Set Up Monitoring**: Import Grafana dashboard from `monitoring/grafana-dashboard.json`
4. **Configure Alerts**: Apply alert rules from `monitoring/alerts.yaml`
5. **Deploy to Production**: Follow deployment guide in README.md

## Getting Help

- **Documentation**: https://docs.adverant.ai/openclaw
- **Issues**: https://github.com/adverant/Adverant-Nexus-Plugin-OpenClaw/issues
- **Email**: support@adverant.ai
- **Slack**: #openclaw channel

## Example Projects

Check out these example projects:

- **OpenAI SDK Integration**: `examples/openai-sdk/`
- **WebSocket Chat Client**: `examples/websocket-chat/`
- **Slack Bot**: `examples/slack-bot/`
- **Discord Bot**: `examples/discord-bot/`

Happy coding! 🚀
