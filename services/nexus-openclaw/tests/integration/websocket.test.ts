/**
 * Integration Tests - WebSocket API
 */

import WebSocket from 'ws';
import { expect } from 'chai';
import { server } from '../../src/index';

describe('WebSocket API Integration Tests', () => {
  let authToken: string;
  let sessionId: string;
  let ws: WebSocket;

  before(async () => {
    // Setup test session
    authToken = 'test-jwt-token';
    sessionId = 'test-session-123';
  });

  afterEach(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  after(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection with valid token', (done) => {
      ws = new WebSocket(
        `ws://localhost:9090/ws?sessionId=${sessionId}&token=${authToken}`
      );

      ws.on('open', () => {
        expect(ws.readyState).to.equal(WebSocket.OPEN);
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should reject connection without token', (done) => {
      ws = new WebSocket(`ws://localhost:9090/ws?sessionId=${sessionId}`);

      ws.on('error', () => {
        expect(ws.readyState).to.not.equal(WebSocket.OPEN);
        done();
      });

      ws.on('open', () => {
        done(new Error('Should not connect without token'));
      });
    });

    it('should reject connection with invalid token', (done) => {
      ws = new WebSocket(
        `ws://localhost:9090/ws?sessionId=${sessionId}&token=invalid-token`
      );

      ws.on('error', () => {
        expect(ws.readyState).to.not.equal(WebSocket.OPEN);
        done();
      });

      ws.on('open', () => {
        done(new Error('Should not connect with invalid token'));
      });
    });

    it('should reject connection without session ID', (done) => {
      ws = new WebSocket(`ws://localhost:9090/ws?token=${authToken}`);

      ws.on('error', () => {
        expect(ws.readyState).to.not.equal(WebSocket.OPEN);
        done();
      });

      ws.on('open', () => {
        done(new Error('Should not connect without session ID'));
      });
    });
  });

  describe('WebSocket Messaging', () => {
    beforeEach((done) => {
      ws = new WebSocket(
        `ws://localhost:9090/ws?sessionId=${sessionId}&token=${authToken}`
      );
      ws.on('open', () => done());
      ws.on('error', done);
    });

    it('should send and receive messages', (done) => {
      const testMessage = {
        type: 'message',
        content: 'Hello, Claude!',
      };

      ws.on('message', (data: WebSocket.Data) => {
        const response = JSON.parse(data.toString());

        expect(response).to.have.property('type', 'message');
        expect(response).to.have.property('messageId');
        expect(response).to.have.property('sessionId', sessionId);
        expect(response).to.have.property('role', 'assistant');
        expect(response).to.have.property('content');
        expect(response).to.have.property('timestamp');

        done();
      });

      ws.send(JSON.stringify(testMessage));
    });

    it('should handle streaming responses', (done) => {
      const testMessage = {
        type: 'message',
        content: 'Tell me a story',
        stream: true,
      };

      let chunks: any[] = [];

      ws.on('message', (data: WebSocket.Data) => {
        const response = JSON.parse(data.toString());

        if (response.type === 'stream') {
          chunks.push(response);

          if (response.done) {
            expect(chunks.length).to.be.greaterThan(0);
            const fullContent = chunks.map((c) => c.chunk).join('');
            expect(fullContent.length).to.be.greaterThan(0);
            done();
          }
        }
      });

      ws.send(JSON.stringify(testMessage));
    });

    it('should handle skill execution', (done) => {
      const testMessage = {
        type: 'message',
        content: 'Search for TypeScript',
        metadata: {
          skillName: 'search',
        },
      };

      ws.on('message', (data: WebSocket.Data) => {
        const response = JSON.parse(data.toString());

        expect(response).to.have.property('type', 'message');
        expect(response).to.have.property('content');
        expect(response.metadata).to.have.property('skillExecuted', true);

        done();
      });

      ws.send(JSON.stringify(testMessage));
    });

    it('should handle errors gracefully', (done) => {
      const invalidMessage = 'invalid-json';

      ws.on('message', (data: WebSocket.Data) => {
        const response = JSON.parse(data.toString());

        expect(response).to.have.property('type', 'error');
        expect(response).to.have.property('code');
        expect(response).to.have.property('message');

        done();
      });

      ws.send(invalidMessage);
    });

    it('should respect message rate limits', (done) => {
      let rateLimitHit = false;

      ws.on('message', (data: WebSocket.Data) => {
        const response = JSON.parse(data.toString());

        if (response.type === 'error' && response.code === 'RATE_LIMIT_EXCEEDED') {
          rateLimitHit = true;
          expect(response).to.have.property('retryAfter');
          done();
        }
      });

      // Send many messages rapidly
      for (let i = 0; i < 250; i++) {
        ws.send(
          JSON.stringify({
            type: 'message',
            content: `Message ${i}`,
          })
        );
      }

      setTimeout(() => {
        if (!rateLimitHit) {
          done(new Error('Rate limit should have been hit'));
        }
      }, 5000);
    });
  });

  describe('WebSocket Connection Limits', () => {
    it('should enforce concurrent connection limits', async () => {
      const connections: WebSocket[] = [];

      // Open Source tier: max 5 connections
      for (let i = 0; i < 6; i++) {
        const conn = new WebSocket(
          `ws://localhost:9090/ws?sessionId=${sessionId}-${i}&token=${authToken}`
        );
        connections.push(conn);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const openConnections = connections.filter(
        (c) => c.readyState === WebSocket.OPEN
      );

      expect(openConnections.length).to.be.at.most(5);

      // Cleanup
      connections.forEach((c) => {
        if (c.readyState === WebSocket.OPEN) {
          c.close();
        }
      });
    });
  });

  describe('WebSocket Reconnection', () => {
    it('should allow reconnection after disconnect', (done) => {
      ws = new WebSocket(
        `ws://localhost:9090/ws?sessionId=${sessionId}&token=${authToken}`
      );

      ws.on('open', () => {
        ws.close();
      });

      ws.on('close', () => {
        // Reconnect
        const ws2 = new WebSocket(
          `ws://localhost:9090/ws?sessionId=${sessionId}&token=${authToken}`
        );

        ws2.on('open', () => {
          expect(ws2.readyState).to.equal(WebSocket.OPEN);
          ws2.close();
          done();
        });

        ws2.on('error', done);
      });
    });
  });

  describe('WebSocket Ping/Pong', () => {
    it('should respond to ping with pong', (done) => {
      ws = new WebSocket(
        `ws://localhost:9090/ws?sessionId=${sessionId}&token=${authToken}`
      );

      ws.on('open', () => {
        ws.ping();
      });

      ws.on('pong', () => {
        done();
      });

      ws.on('error', done);
    });

    it('should keep connection alive with heartbeat', function (done) {
      this.timeout(35000); // Extend timeout for heartbeat test

      ws = new WebSocket(
        `ws://localhost:9090/ws?sessionId=${sessionId}&token=${authToken}`
      );

      let pongCount = 0;

      ws.on('open', () => {
        const interval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
          } else {
            clearInterval(interval);
          }
        }, 10000); // Ping every 10 seconds

        setTimeout(() => {
          clearInterval(interval);
          expect(pongCount).to.be.greaterThan(0);
          done();
        }, 30000);
      });

      ws.on('pong', () => {
        pongCount++;
      });

      ws.on('error', done);
    });
  });
});
