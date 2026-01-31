/**
 * Nexus FileProcess Upload Skill
 *
 * Upload documents to FileProcess service for processing
 *
 * @module skills/nexus-fileprocess-upload
 */

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import Joi from 'joi';
import {
  AgentSkill,
  SkillCategory,
  SkillExecutionContext,
  SkillExecutionResult,
  SkillMetadata,
  ValidationResult,
  FileProcessUploadRequest,
  FileProcessResult
} from '../types';

class FileProcessUploadSkill implements AgentSkill<FileProcessUploadRequest, FileProcessResult> {
  name = 'nexus-fileprocess-upload';
  description = 'Upload documents to FileProcess service';
  category = SkillCategory.AUTOMATION;
  version = '1.0.0';

  private client: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXUS_FILEPROCESS_URL || 'http://nexus-fileprocess:9004';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 120000, // 2 minutes for large files
      maxBodyLength: 50 * 1024 * 1024, // 50MB
      maxContentLength: 50 * 1024 * 1024
    });
  }

  private inputSchema = Joi.object({
    fileUrl: Joi.string().uri().optional(),
    fileBuffer: Joi.binary().optional(),
    fileName: Joi.string().required(),
    mimeType: Joi.string().required(),
    processType: Joi.string().valid('extract', 'analyze', 'convert').default('extract')
  }).xor('fileUrl', 'fileBuffer');

  async validate(input: FileProcessUploadRequest): Promise<ValidationResult> {
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

  async execute(
    input: FileProcessUploadRequest,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult<FileProcessResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({
        stage: 'uploading',
        progress: 20,
        message: 'Uploading file to FileProcess service...'
      });

      let fileData: Buffer;

      // Download file if URL provided
      if (input.fileUrl) {
        context.onProgress?.({
          stage: 'downloading',
          progress: 10,
          message: 'Downloading file from URL...'
        });

        const downloadResponse = await axios.get(input.fileUrl, {
          responseType: 'arraybuffer'
        });
        fileData = Buffer.from(downloadResponse.data);
      } else if (input.fileBuffer) {
        fileData = input.fileBuffer;
      } else {
        throw new Error('Either fileUrl or fileBuffer must be provided');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', fileData, {
        filename: input.fileName,
        contentType: input.mimeType
      });
      formData.append('process_type', input.processType || 'extract');
      formData.append('organization_id', context.organizationId);
      formData.append('user_id', context.userId);

      // Upload file
      const response = await this.client.post<FileProcessResult>(
        '/api/v1/upload',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      context.onProgress?.({
        stage: 'processing',
        progress: 60,
        message: 'File uploaded, processing...'
      });

      // Poll for processing completion
      const fileId = response.data.fileId;
      const result = await this.pollProcessingStatus(fileId, context);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        metadata: {
          executionTime,
          fileSize: fileData.length,
          fileName: input.fileName
        },
        executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          code: 'FILEPROCESS_UPLOAD_ERROR',
          message: error.response?.data?.message || error.message || 'File upload failed',
          details: error.response?.data,
          retryable: error.response?.status >= 500 || error.code === 'ECONNREFUSED',
          timestamp: new Date()
        },
        executionTime
      };
    }
  }

  private async pollProcessingStatus(
    fileId: string,
    context: SkillExecutionContext
  ): Promise<FileProcessResult> {
    const maxPolls = 24; // 2 minutes max (5 sec intervals)

    for (let i = 0; i < maxPolls; i++) {
      await this.sleep(5000);

      const response = await this.client.get<FileProcessResult>(
        `/api/v1/files/${fileId}/status`,
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      const progress = 60 + ((i / maxPolls) * 35);
      context.onProgress?.({
        stage: 'processing',
        progress,
        message: `Processing: ${response.data.status}`
      });

      if (response.data.status === 'completed') {
        return response.data;
      }

      if (response.data.status === 'failed') {
        throw new Error('File processing failed');
      }
    }

    throw new Error('File processing timeout');
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
      tags: ['files', 'upload', 'processing', 'documents'],
      inputSchema: {
        fileUrl: { type: 'string', required: false },
        fileBuffer: { type: 'buffer', required: false },
        fileName: { type: 'string', required: true },
        mimeType: { type: 'string', required: true },
        processType: { type: 'string', enum: ['extract', 'analyze', 'convert'], default: 'extract' }
      },
      outputSchema: {
        fileId: { type: 'string' },
        fileName: { type: 'string' },
        status: { type: 'string' },
        result: { type: 'object' }
      },
      requiredServices: ['nexus-fileprocess'],
      estimatedDuration: 30
    };
  }
}

export default new FileProcessUploadSkill();
