/**
 * Channels API Routes
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

const router = Router();

// Get all channels for the user
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user?.organizationId;

    // Return sample channels
    const channels = [
      {
        channel_id: uuidv4(),
        organization_id: organizationId,
        channel_type: 'web',
        channel_name: 'Web Chat',
        active: true,
        connection_status: 'connected',
      },
    ];

    res.json({ success: true, data: channels });
  } catch (error) {
    logger.error('Failed to get channels', { error });
    res.status(500).json({ success: false, error: 'Failed to get channels' });
  }
});

// Create a new channel
router.post('/', async (req: Request, res: Response) => {
  try {
    const { channelType, channelName, channelIdentifier, config } = req.body;
    const userId = (req as any).user?.userId;
    const organizationId = (req as any).user?.organizationId;

    const channel = {
      channel_id: uuidv4(),
      user_id: userId,
      organization_id: organizationId,
      channel_type: channelType,
      channel_name: channelName,
      channel_identifier: channelIdentifier,
      channel_config: config,
      active: true,
      connection_status: 'pending',
      created_at: new Date().toISOString(),
    };

    res.status(201).json({ success: true, data: channel });
  } catch (error) {
    logger.error('Failed to create channel', { error });
    res.status(500).json({ success: false, error: 'Failed to create channel' });
  }
});

// Get a specific channel
router.get('/:channelId', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;

    const channel = {
      channel_id: channelId,
      channel_type: 'web',
      channel_name: 'Web Chat',
      active: true,
      connection_status: 'connected',
    };

    res.json({ success: true, data: channel });
  } catch (error) {
    logger.error('Failed to get channel', { error });
    res.status(500).json({ success: false, error: 'Failed to get channel' });
  }
});

// Update a channel
router.put('/:channelId', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const updates = req.body;

    res.json({
      success: true,
      data: { channel_id: channelId, ...updates, updated_at: new Date().toISOString() },
    });
  } catch (error) {
    logger.error('Failed to update channel', { error });
    res.status(500).json({ success: false, error: 'Failed to update channel' });
  }
});

// Delete a channel
router.delete('/:channelId', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    res.json({ success: true, message: `Channel ${channelId} deleted` });
  } catch (error) {
    logger.error('Failed to delete channel', { error });
    res.status(500).json({ success: false, error: 'Failed to delete channel' });
  }
});

// Connect a channel
router.post('/:channelId/connect', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    res.json({
      success: true,
      data: { channel_id: channelId, connection_status: 'connected' },
    });
  } catch (error) {
    logger.error('Failed to connect channel', { error });
    res.status(500).json({ success: false, error: 'Failed to connect channel' });
  }
});

// Disconnect a channel
router.post('/:channelId/disconnect', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    res.json({
      success: true,
      data: { channel_id: channelId, connection_status: 'disconnected' },
    });
  } catch (error) {
    logger.error('Failed to disconnect channel', { error });
    res.status(500).json({ success: false, error: 'Failed to disconnect channel' });
  }
});

export const channelsRoutes = router;
