/**
 * Skills API Routes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// List of available skills
const AVAILABLE_SKILLS = [
  { name: 'nexus-graphrag-search', category: 'knowledge', description: 'Search Nexus knowledge graph' },
  { name: 'nexus-graphrag-store', category: 'knowledge', description: 'Store data in knowledge graph' },
  { name: 'nexus-mageagent-task', category: 'automation', description: 'Execute MageAgent tasks' },
  { name: 'nexus-fileprocess-upload', category: 'files', description: 'Upload and process files' },
  { name: 'nexus-fileprocess-extract', category: 'files', description: 'Extract content from files' },
  { name: 'nexus-github-pr-review', category: 'development', description: 'Review GitHub pull requests' },
  { name: 'nexus-github-commit', category: 'development', description: 'Create GitHub commits' },
  { name: 'nexus-github-issues', category: 'development', description: 'Manage GitHub issues' },
  { name: 'nexus-communication-email', category: 'communication', description: 'Send emails' },
  { name: 'nexus-communication-slack', category: 'communication', description: 'Send Slack messages' },
  { name: 'nexus-communication-teams', category: 'communication', description: 'Send Teams messages' },
  { name: 'nexus-calendar-event', category: 'calendar', description: 'Create calendar events' },
  { name: 'nexus-calendar-sync', category: 'calendar', description: 'Sync calendar data' },
  { name: 'nexus-analytics-query', category: 'analytics', description: 'Query analytics data' },
  { name: 'nexus-billing-invoice', category: 'finance', description: 'Generate invoices' },
  { name: 'nexus-crm-ticket', category: 'crm', description: 'Create CRM tickets' },
  { name: 'nexus-law-analyze', category: 'legal', description: 'Analyze legal documents' },
  { name: 'nexus-video-transcribe', category: 'media', description: 'Transcribe video content' },
  { name: 'nexus-browser-scrape', category: 'automation', description: 'Web scraping' },
  { name: 'nexus-cyberagent-scan', category: 'security', description: 'Security scanning' },
];

// Get all available skills
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    let skills = AVAILABLE_SKILLS;
    if (category) {
      skills = skills.filter((s) => s.category === category);
    }

    res.json({
      success: true,
      data: skills,
      total: skills.length,
    });
  } catch (error) {
    logger.error('Failed to get skills', { error });
    res.status(500).json({ success: false, error: 'Failed to get skills' });
  }
});

// Get skill categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = [...new Set(AVAILABLE_SKILLS.map((s) => s.category))];
    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('Failed to get categories', { error });
    res.status(500).json({ success: false, error: 'Failed to get categories' });
  }
});

// Get a specific skill
router.get('/:skillName', async (req: Request, res: Response) => {
  try {
    const { skillName } = req.params;
    const skill = AVAILABLE_SKILLS.find((s) => s.name === skillName);

    if (!skill) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }

    res.json({ success: true, data: skill });
  } catch (error) {
    logger.error('Failed to get skill', { error });
    res.status(500).json({ success: false, error: 'Failed to get skill' });
  }
});

// Execute a skill
router.post('/:skillName/execute', async (req: Request, res: Response) => {
  try {
    const { skillName } = req.params;
    const { params } = req.body;

    const skill = AVAILABLE_SKILLS.find((s) => s.name === skillName);
    if (!skill) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }

    // Simulate skill execution
    const result = {
      execution_id: `exec_${Date.now()}`,
      skill_name: skillName,
      status: 'completed',
      output: { message: `Skill ${skillName} executed successfully`, params },
      execution_time_ms: Math.floor(Math.random() * 1000) + 100,
    };

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to execute skill', { error });
    res.status(500).json({ success: false, error: 'Failed to execute skill' });
  }
});

export const skillsRoutes = router;
