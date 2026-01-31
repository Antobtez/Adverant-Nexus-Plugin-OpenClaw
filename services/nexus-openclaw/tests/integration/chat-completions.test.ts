/**
 * Integration Tests - Chat Completions API (OpenAI-compatible)
 */

import request from 'supertest';
import { expect } from 'chai';
import { app, server } from '../../src/index';

describe('Chat Completions API Integration Tests', () => {
  let authToken: string;
  let sessionId: string;

  before(async () => {
    authToken = 'test-jwt-token';

    // Create session first
    const sessionResponse = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ metadata: {} });

    sessionId = sessionResponse.body.sessionId;
  });

  after(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('POST /api/v1/chat/completions', () => {
    it('should complete chat with non-streaming response', async () => {
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          sessionId,
          messages: [
            {
              role: 'user',
              content: 'Hello, Claude!',
            },
          ],
          stream: false,
        })
        .expect(200);

      expect(response.body).to.have.property('id');
      expect(response.body).to.have.property('object', 'chat.completion');
      expect(response.body).to.have.property('created');
      expect(response.body).to.have.property('model', 'claude-sonnet-4.5');
      expect(response.body).to.have.property('choices');
      expect(response.body.choices).to.be.an('array');
      expect(response.body.choices[0]).to.have.property('index', 0);
      expect(response.body.choices[0]).to.have.property('message');
      expect(response.body.choices[0].message).to.have.property('role', 'assistant');
      expect(response.body.choices[0].message).to.have.property('content');
      expect(response.body.choices[0]).to.have.property('finish_reason');
      expect(response.body).to.have.property('usage');
      expect(response.body.usage).to.have.property('prompt_tokens');
      expect(response.body.usage).to.have.property('completion_tokens');
      expect(response.body.usage).to.have.property('total_tokens');
    });

    it('should support streaming responses', async () => {
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          sessionId,
          messages: [
            {
              role: 'user',
              content: 'Count to 5',
            },
          ],
          stream: true,
        })
        .expect(200);

      expect(response.headers['content-type']).to.include('text/event-stream');

      // Parse SSE chunks
      const chunks = response.text.split('\n\n').filter((c) => c.startsWith('data: '));

      expect(chunks.length).to.be.greaterThan(0);

      chunks.forEach((chunk) => {
        if (chunk !== 'data: [DONE]') {
          const data = JSON.parse(chunk.replace('data: ', ''));
          expect(data).to.have.property('id');
          expect(data).to.have.property('object', 'chat.completion.chunk');
          expect(data).to.have.property('created');
          expect(data).to.have.property('model');
          expect(data).to.have.property('choices');
        }
      });
    });

    it('should handle multi-turn conversations', async () => {
      // First message
      const response1 = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          sessionId,
          messages: [
            {
              role: 'user',
              content: 'My name is Alice',
            },
          ],
        })
        .expect(200);

      // Second message
      const response2 = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          sessionId,
          messages: [
            {
              role: 'user',
              content: 'My name is Alice',
            },
            {
              role: 'assistant',
              content: response1.body.choices[0].message.content,
            },
            {
              role: 'user',
              content: 'What is my name?',
            },
          ],
        })
        .expect(200);

      expect(response2.body.choices[0].message.content.toLowerCase()).to.include('alice');
    });

    it('should support system messages', async () => {
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          sessionId,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful pirate assistant. Always respond like a pirate.',
            },
            {
              role: 'user',
              content: 'Hello!',
            },
          ],
        })
        .expect(200);

      const content = response.body.choices[0].message.content.toLowerCase();
      // Should contain pirate-like language
      const pirateWords = ['ahoy', 'matey', 'arr', 'aye', 'ye', 'ship'];
      const hasPirateWord = pirateWords.some((word) => content.includes(word));

      expect(hasPirateWord).to.be.true;
    });

    it('should respect temperature parameter', async () => {
      // Low temperature (more deterministic)
      const response1 = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          sessionId,
          messages: [
            {
              role: 'user',
              content: 'Say exactly: Hello World',
            },
          ],
          temperature: 0.0,
        })
        .expect(200);

      expect(response1.body.choices[0].message.content).to.include('Hello World');
    });

    it('should respect max_tokens parameter', async () => {
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          sessionId,
          messages: [
            {
              role: 'user',
              content: 'Write a long story',
            },
          ],
          max_tokens: 50,
        })
        .expect(200);

      expect(response.body.usage.completion_tokens).to.be.at.most(50);
    });

    it('should reject invalid model', async () => {
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'invalid-model',
          sessionId,
          messages: [
            {
              role: 'user',
              content: 'Hello',
            },
          ],
        })
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code', 'BAD_REQUEST');
    });

    it('should reject empty messages', async () => {
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          sessionId,
          messages: [],
        })
        .expect(400);

      expect(response.body).to.have.property('error');
    });

    it('should execute skills when specified', async () => {
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          sessionId,
          messages: [
            {
              role: 'user',
              content: 'Search for TypeScript information',
            },
          ],
          metadata: {
            skillName: 'search',
          },
        })
        .expect(200);

      expect(response.body.choices[0].message.content).to.be.a('string');
    });

    it('should handle skill execution errors gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          sessionId,
          messages: [
            {
              role: 'user',
              content: 'Execute invalid skill',
            },
          ],
          metadata: {
            skillName: 'non-existent-skill',
          },
        })
        .expect(400);

      expect(response.body).to.have.property('error');
    });

    it('should track message history', async () => {
      // Send multiple messages
      await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          sessionId,
          messages: [{ role: 'user', content: 'Message 1' }],
        });

      await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          sessionId,
          messages: [{ role: 'user', content: 'Message 2' }],
        });

      // Retrieve message history
      const historyResponse = await request(app)
        .get(`/api/v1/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.messages).to.be.an('array');
      expect(historyResponse.body.messages.length).to.be.at.least(4); // 2 user + 2 assistant
    });

    it('should respect quota limits', async () => {
      // Send many requests to exceed quota
      const requests = [];
      for (let i = 0; i < 10100; i++) {
        requests.push(
          request(app)
            .post('/api/v1/chat/completions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              model: 'claude-sonnet-4.5',
              sessionId,
              messages: [{ role: 'user', content: `Message ${i}` }],
            })
        );
      }

      const responses = await Promise.all(requests);
      const quotaExceededResponses = responses.filter((r) => r.status === 403);

      expect(quotaExceededResponses.length).to.be.greaterThan(0);
    });
  });

  describe('OpenAI SDK Compatibility', () => {
    it('should work with OpenAI SDK client', async () => {
      // Simulate OpenAI SDK request format
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({
          model: 'claude-sonnet-4.5',
          messages: [
            {
              role: 'user',
              content: 'Hello',
            },
          ],
          temperature: 0.7,
          max_tokens: 100,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        })
        .expect(200);

      // Verify OpenAI-compatible response format
      expect(response.body).to.have.property('id');
      expect(response.body).to.have.property('object', 'chat.completion');
      expect(response.body).to.have.property('created');
      expect(response.body).to.have.property('model');
      expect(response.body).to.have.property('choices');
      expect(response.body).to.have.property('usage');
    });
  });
});
