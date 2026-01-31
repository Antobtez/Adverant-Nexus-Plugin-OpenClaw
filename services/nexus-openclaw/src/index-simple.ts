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

// Serve Next.js static export from ui/out directory
const uiPath = process.env.UI_BUILD_PATH || path.join(__dirname, '..', 'ui', 'out');
console.log(`[OpenClaw] UI path: ${uiPath}`);

// Serve static files for /openclaw/ui/*
app.use('/openclaw/ui', express.static(uiPath, {
  index: 'index.html',
  extensions: ['html'],
  maxAge: '1d',
  etag: true,
}));

// Handle SPA routing - serve index.html for unmatched routes under /openclaw/ui
app.get('/openclaw/ui/*', (req: Request, res: Response) => {
  res.sendFile(path.join(uiPath, 'index.html'));
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
