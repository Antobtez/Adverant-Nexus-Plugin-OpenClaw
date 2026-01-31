/**
 * Integration Tests - Session API
 */

import request from 'supertest';
import { expect } from 'chai';
import { app, server } from '../../src/index';
import { DatabaseService } from '../../src/database/database.service';
import { RedisService } from '../../src/database/redis.service';

describe('Session API Integration Tests', () => {
  let authToken: string;
  let organizationId: string;
  let userId: string;
  let sessionId: string;

  before(async () => {
    // Setup test user authentication
    // In real tests, this would call Nexus Auth
    authToken = 'test-jwt-token';
    organizationId = 'test-org-123';
    userId = 'test-user-456';
  });

  after(async () => {
    // Cleanup
    if (server) {
      await server.close();
    }
  });

  describe('POST /api/v1/sessions', () => {
    it('should create a new session', async () => {
      const response = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metadata: {
            project: 'test-project',
            environment: 'test',
          },
        })
        .expect(201);

      expect(response.body).to.have.property('sessionId');
      expect(response.body).to.have.property('organizationId', organizationId);
      expect(response.body).to.have.property('userId', userId);
      expect(response.body).to.have.property('tier');
      expect(response.body).to.have.property('status', 'active');
      expect(response.body).to.have.property('createdAt');
      expect(response.body).to.have.property('expiresAt');

      sessionId = response.body.sessionId;
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/sessions')
        .send({
          metadata: {},
        })
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code', 'UNAUTHORIZED');
    });

    it('should respect rate limits', async () => {
      // Send requests up to rate limit
      const requests = [];
      for (let i = 0; i < 105; i++) {
        requests.push(
          request(app)
            .post('/api/v1/sessions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ metadata: {} })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      expect(rateLimitedResponses.length).to.be.greaterThan(0);
    });
  });

  describe('GET /api/v1/sessions/:sessionId', () => {
    it('should retrieve session by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.have.property('sessionId', sessionId);
      expect(response.body).to.have.property('organizationId', organizationId);
      expect(response.body).to.have.property('status', 'active');
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/v1/sessions/non-existent-session-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code', 'NOT_FOUND');
    });

    it('should not allow cross-organization access', async () => {
      // Simulate different organization token
      const otherOrgToken = 'other-org-token';

      const response = await request(app)
        .get(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .expect(403);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code', 'FORBIDDEN');
    });
  });

  describe('PUT /api/v1/sessions/:sessionId', () => {
    it('should update session metadata', async () => {
      const response = await request(app)
        .put(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metadata: {
            project: 'updated-project',
            version: '2.0',
          },
        })
        .expect(200);

      expect(response.body).to.have.property('sessionId', sessionId);
      expect(response.body.metadata).to.have.property('project', 'updated-project');
      expect(response.body.metadata).to.have.property('version', '2.0');
    });
  });

  describe('DELETE /api/v1/sessions/:sessionId', () => {
    it('should delete session', async () => {
      await request(app)
        .delete(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify session is deleted
      await request(app)
        .get(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/sessions', () => {
    it('should list sessions for organization', async () => {
      // Create multiple sessions
      await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ metadata: { name: 'session-1' } });

      await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ metadata: { name: 'session-2' } });

      const response = await request(app)
        .get('/api/v1/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.have.property('sessions');
      expect(response.body.sessions).to.be.an('array');
      expect(response.body.sessions.length).to.be.at.least(2);
    });

    it('should filter sessions by status', async () => {
      const response = await request(app)
        .get('/api/v1/sessions?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.sessions).to.be.an('array');
      response.body.sessions.forEach((session: any) => {
        expect(session.status).to.equal('active');
      });
    });
  });
});
