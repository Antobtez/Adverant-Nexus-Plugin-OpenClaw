/**
 * Nexus Video Transcription Skill
 *
 * Transcribe video content with speaker diarization
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult, VideoTranscriptionRequest } from '../types';

interface VideoTranscriptionResult {
  transcriptionId: string;
  videoUrl: string;
  transcript: string;
  segments: Array<{
    speaker?: string;
    startTime: number;
    endTime: number;
    text: string;
    confidence: number;
  }>;
  summary?: string;
  duration: number;
  language: string;
}

class VideoTranscriptionSkill implements AgentSkill<VideoTranscriptionRequest, VideoTranscriptionResult> {
  name = 'nexus-video-transcribe';
  description = 'Transcribe video content with speaker identification';
  category = SkillCategory.MEDIA;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_VIDEOAGENT_URL || 'http://nexus-videoagent:9006',
      timeout: 600000, // 10 minutes for long videos
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    videoUrl: Joi.string().uri().required(),
    language: Joi.string().optional().default('en'),
    includeTimestamps: Joi.boolean().default(true),
    speakerDiarization: Joi.boolean().default(true)
  });

  async validate(input: VideoTranscriptionRequest): Promise<ValidationResult> {
    const { error } = this.inputSchema.validate(input, { abortEarly: false });
    if (error) {
      return {
        valid: false,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          code: detail.type
        }))
      };
    }
    return { valid: true };
  }

  async execute(input: VideoTranscriptionRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<VideoTranscriptionResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'processing', progress: 20, message: 'Processing video...' });

      // Start transcription
      const startResponse = await this.client.post(
        '/api/v1/transcribe',
        {
          video_url: input.videoUrl,
          language: input.language || 'en',
          include_timestamps: input.includeTimestamps !== false,
          speaker_diarization: input.speakerDiarization !== false,
          organization_id: context.organizationId
        },
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      const transcriptionId = startResponse.data.transcription_id;

      // Poll for completion
      const result = await this.pollTranscriptionStatus(transcriptionId, context);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        metadata: { executionTime, videoDuration: result.duration },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'VIDEO_TRANSCRIPTION_ERROR',
          message: error.response?.data?.message || error.message || 'Video transcription failed',
          details: error.response?.data,
          retryable: error.response?.status >= 500,
          timestamp: new Date()
        },
        executionTime: Date.now() - startTime
      };
    }
  }

  private async pollTranscriptionStatus(
    transcriptionId: string,
    context: SkillExecutionContext
  ): Promise<VideoTranscriptionResult> {
    const maxPolls = 60; // 5 minutes max (5 sec intervals)

    for (let i = 0; i < maxPolls; i++) {
      await this.sleep(5000);

      const response = await this.client.get<VideoTranscriptionResult>(
        `/api/v1/transcriptions/${transcriptionId}`,
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      const progress = 20 + ((i / maxPolls) * 75);
      context.onProgress?.({
        stage: 'transcribing',
        progress,
        message: 'Transcribing video...'
      });

      if (response.data.transcript) {
        return response.data;
      }
    }

    throw new Error('Transcription timeout');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMetadata(): SkillMetadata {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      version: this.version,
      author: 'Adverant AI',
      tags: ['video', 'transcription', 'speech-to-text', 'media'],
      inputSchema: {
        videoUrl: { type: 'string', required: true },
        language: { type: 'string', default: 'en' },
        includeTimestamps: { type: 'boolean', default: true },
        speakerDiarization: { type: 'boolean', default: true }
      },
      outputSchema: {
        transcriptionId: { type: 'string' },
        transcript: { type: 'string' },
        segments: { type: 'array' },
        duration: { type: 'number' }
      },
      requiredServices: ['nexus-videoagent'],
      estimatedDuration: 120
    };
  }
}

export default new VideoTranscriptionSkill();
