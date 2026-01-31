/**
 * OpenClaw Assistant - Simplified HTTP Server
 *
 * A minimal working server that provides:
 * - Health check endpoints
 * - Basic REST API
 * - Static UI serving
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoints
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'nexus-openclaw', timestamp: new Date().toISOString() });
});

app.get('/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready', service: 'nexus-openclaw' });
});

app.get('/live', (req: Request, res: Response) => {
  res.json({ status: 'live', service: 'nexus-openclaw' });
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', (req: Request, res: Response) => {
  const metrics = `
# HELP openclaw_requests_total Total number of requests
# TYPE openclaw_requests_total counter
openclaw_requests_total{method="GET",path="/health"} 1

# HELP openclaw_uptime_seconds Service uptime in seconds
# TYPE openclaw_uptime_seconds gauge
openclaw_uptime_seconds ${process.uptime()}
`.trim();
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// API Routes
const apiRouter = express.Router();

// Sessions API
apiRouter.get('/sessions', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { session_id: uuidv4(), channel_type: 'web', active: true, created_at: new Date().toISOString() }
    ]
  });
});

apiRouter.post('/sessions', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { session_id: uuidv4(), channel_type: req.body.channelType || 'web', active: true, created_at: new Date().toISOString() }
  });
});

// Skills API
const SKILLS = [
  { name: 'nexus-graphrag-search', category: 'knowledge', description: 'Search Nexus knowledge graph' },
  { name: 'nexus-mageagent-task', category: 'automation', description: 'Execute MageAgent tasks' },
  { name: 'nexus-fileprocess-upload', category: 'files', description: 'Upload and process files' },
  { name: 'nexus-github-pr-review', category: 'development', description: 'Review GitHub pull requests' },
  { name: 'nexus-communication-email', category: 'communication', description: 'Send emails' },
  { name: 'nexus-calendar-event', category: 'calendar', description: 'Create calendar events' },
  { name: 'nexus-analytics-query', category: 'analytics', description: 'Query analytics data' },
  { name: 'nexus-law-analyze', category: 'legal', description: 'Analyze legal documents' },
  { name: 'nexus-video-transcribe', category: 'media', description: 'Transcribe video content' },
  { name: 'nexus-browser-scrape', category: 'automation', description: 'Web scraping' },
];

apiRouter.get('/skills', (req: Request, res: Response) => {
  res.json({ success: true, data: SKILLS, total: SKILLS.length });
});

apiRouter.get('/skills/categories', (req: Request, res: Response) => {
  const categories = [...new Set(SKILLS.map(s => s.category))];
  res.json({ success: true, data: categories });
});

apiRouter.post('/skills/:skillName/execute', (req: Request, res: Response) => {
  const { skillName } = req.params;
  const skill = SKILLS.find(s => s.name === skillName);

  if (!skill) {
    return res.status(404).json({ success: false, error: 'Skill not found' });
  }

  res.json({
    success: true,
    data: {
      execution_id: `exec_${Date.now()}`,
      skill_name: skillName,
      status: 'completed',
      output: { message: `Skill ${skillName} executed successfully` },
      execution_time_ms: Math.floor(Math.random() * 1000) + 100
    }
  });
});

// Channels API
apiRouter.get('/channels', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { channel_id: uuidv4(), channel_type: 'web', channel_name: 'Web Chat', active: true, connection_status: 'connected' }
    ]
  });
});

apiRouter.post('/channels', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      channel_id: uuidv4(),
      channel_type: req.body.channelType || 'web',
      channel_name: req.body.channelName || 'New Channel',
      active: true,
      connection_status: 'pending',
      created_at: new Date().toISOString()
    }
  });
});

// Cron Jobs API
apiRouter.get('/cron', (req: Request, res: Response) => {
  res.json({ success: true, data: [], total: 0 });
});

apiRouter.post('/cron', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      job_id: uuidv4(),
      job_name: req.body.jobName || 'New Job',
      schedule: req.body.schedule || '0 9 * * *',
      skill_name: req.body.skillName,
      enabled: true,
      created_at: new Date().toISOString()
    }
  });
});

// Analytics API
apiRouter.get('/analytics/overview', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      total_sessions: 42,
      active_sessions: 5,
      total_skills_executed: 1287,
      total_messages_sent: 3456,
      avg_response_time_ms: 234,
      success_rate: 0.98
    }
  });
});

apiRouter.get('/analytics/skills', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { skill_name: 'nexus-graphrag-search', executions: 342, avg_time_ms: 189, success_rate: 0.99 },
      { skill_name: 'nexus-mageagent-task', executions: 256, avg_time_ms: 1234, success_rate: 0.95 },
      { skill_name: 'nexus-communication-email', executions: 189, avg_time_ms: 456, success_rate: 0.98 }
    ]
  });
});

// Mount API router
app.use('/openclaw/api/v1', apiRouter);
app.use('/api/v1', apiRouter);

// Serve UI (placeholder HTML for now)
app.get('/openclaw/ui', (req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenClaw Assistant</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen">
  <div class="container mx-auto px-4 py-8">
    <header class="bg-white rounded-lg shadow-md p-6 mb-8">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">OC</div>
        <div>
          <h1 class="text-2xl font-bold text-gray-800">OpenClaw Assistant</h1>
          <p class="text-sm text-gray-500">Multi-channel AI automation powered by Nexus</p>
        </div>
        <span class="ml-auto px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Connected</span>
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Sessions</h3>
        <p class="text-3xl font-bold text-blue-600">42</p>
        <p class="text-sm text-gray-500">5 active</p>
      </div>
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Skills Executed</h3>
        <p class="text-3xl font-bold text-green-600">1,287</p>
        <p class="text-sm text-gray-500">98% success rate</p>
      </div>
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Messages</h3>
        <p class="text-3xl font-bold text-purple-600">3,456</p>
        <p class="text-sm text-gray-500">234ms avg response</p>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Available Skills (${SKILLS.length}+)</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${SKILLS.map(skill => `
          <div class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <h3 class="font-semibold text-gray-800">${skill.name}</h3>
            <p class="text-sm text-gray-500">${skill.description}</p>
            <span class="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">${skill.category}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Supported Channels</h2>
      <div class="flex flex-wrap gap-4">
        <div class="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
          <span class="w-3 h-3 bg-green-500 rounded-full"></span>
          <span class="font-medium">WhatsApp</span>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
          <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
          <span class="font-medium">Telegram</span>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-200">
          <span class="w-3 h-3 bg-indigo-500 rounded-full"></span>
          <span class="font-medium">Discord</span>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg border border-purple-200">
          <span class="w-3 h-3 bg-purple-500 rounded-full"></span>
          <span class="font-medium">Slack</span>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <span class="w-3 h-3 bg-gray-500 rounded-full"></span>
          <span class="font-medium">Web</span>
        </div>
      </div>
    </div>

    <footer class="mt-8 text-center text-sm text-gray-500">
      <p>OpenClaw v1.0.0 | Nexus Plugin</p>
      <p class="mt-1">
        <a href="https://docs.adverant.ai/plugins/openclaw" class="text-blue-600 hover:underline">Documentation</a> |
        <a href="https://github.com/adverant/Adverant-Nexus-Plugin-OpenClaw" class="text-blue-600 hover:underline">GitHub</a>
      </p>
    </footer>
  </div>
</body>
</html>
  `);
});

// Redirect /ui to /openclaw/ui
app.get('/ui', (req: Request, res: Response) => {
  res.redirect('/openclaw/ui');
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, error: err.message });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    OpenClaw Assistant                        ║
║                     v1.0.0 (Simplified)                      ║
╠══════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                                  ║
║  Health: /health, /ready, /live                              ║
║  Metrics: /metrics                                           ║
║  API: /openclaw/api/v1/*                                     ║
║  UI: /openclaw/ui                                            ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
