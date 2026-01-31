/**
 * Test Setup and Teardown
 *
 * This file runs before all tests to set up the test environment
 * and after all tests to clean up.
 */

import { Pool } from 'pg';
import Redis from 'ioredis';

// Test database configuration
const testDbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_TEST_DB || 'nexus_test',
  user: process.env.POSTGRES_USER || 'nexus',
  password: process.env.POSTGRES_PASSWORD || 'password',
};

// Test Redis configuration
const testRedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_TEST_DB || '1', 10),
};

export let testPool: Pool;
export let testRedis: Redis;

/**
 * Setup test environment
 */
export async function setupTests(): Promise<void> {
  console.log('Setting up test environment...');

  // Connect to test database
  testPool = new Pool(testDbConfig);

  try {
    await testPool.query('SELECT NOW()');
    console.log('Test database connection established');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }

  // Connect to test Redis
  testRedis = new Redis(testRedisConfig);

  try {
    await testRedis.ping();
    console.log('Test Redis connection established');
  } catch (error) {
    console.error('Failed to connect to test Redis:', error);
    throw error;
  }

  // Clean test database
  await cleanDatabase();

  // Run migrations
  await runMigrations();

  console.log('Test environment setup complete');
}

/**
 * Teardown test environment
 */
export async function teardownTests(): Promise<void> {
  console.log('Tearing down test environment...');

  // Clean test database
  await cleanDatabase();

  // Close connections
  if (testPool) {
    await testPool.end();
  }

  if (testRedis) {
    await testRedis.quit();
  }

  console.log('Test environment teardown complete');
}

/**
 * Clean test database
 */
async function cleanDatabase(): Promise<void> {
  try {
    // Truncate all test tables
    await testPool.query(`
      TRUNCATE TABLE
        openclaw_skill_executions,
        openclaw_messages,
        openclaw_sessions
      CASCADE
    `);

    // Clear Redis test database
    await testRedis.flushdb();

    console.log('Test database cleaned');
  } catch (error) {
    console.error('Failed to clean test database:', error);
    // Don't throw - tables might not exist yet
  }
}

/**
 * Run database migrations
 */
async function runMigrations(): Promise<void> {
  try {
    // Create tables
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS openclaw_sessions (
        session_id UUID PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        tier VARCHAR(50) NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP,
        status VARCHAR(50) NOT NULL DEFAULT 'active'
      )
    `);

    await testPool.query(`
      CREATE TABLE IF NOT EXISTS openclaw_messages (
        message_id UUID PRIMARY KEY,
        session_id UUID NOT NULL,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}',
        CONSTRAINT fk_session FOREIGN KEY (session_id)
          REFERENCES openclaw_sessions(session_id) ON DELETE CASCADE
      )
    `);

    await testPool.query(`
      CREATE TABLE IF NOT EXISTS openclaw_skill_executions (
        execution_id UUID PRIMARY KEY,
        session_id UUID NOT NULL,
        skill_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        duration_ms INTEGER,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_session_exec FOREIGN KEY (session_id)
          REFERENCES openclaw_sessions(session_id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await testPool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_org ON openclaw_sessions(organization_id)
    `);

    await testPool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_session ON openclaw_messages(session_id)
    `);

    await testPool.query(`
      CREATE INDEX IF NOT EXISTS idx_executions_session ON openclaw_skill_executions(session_id)
    `);

    console.log('Database migrations applied');
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }
}

/**
 * Create test session
 */
export async function createTestSession(
  organizationId: string,
  userId: string,
  tier: string = 'open_source'
): Promise<string> {
  const sessionId = `test-session-${Date.now()}`;

  await testPool.query(
    `
    INSERT INTO openclaw_sessions (
      session_id, organization_id, user_id, tier, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
    `,
    [sessionId, organizationId, userId, tier]
  );

  return sessionId;
}

/**
 * Create test message
 */
export async function createTestMessage(
  sessionId: string,
  role: string,
  content: string
): Promise<string> {
  const messageId = `test-message-${Date.now()}`;

  await testPool.query(
    `
    INSERT INTO openclaw_messages (
      message_id, session_id, role, content, timestamp
    ) VALUES ($1, $2, $3, $4, NOW())
    `,
    [messageId, sessionId, role, content]
  );

  return messageId;
}

/**
 * Get test JWT token
 */
export function getTestToken(
  userId: string = 'test-user',
  organizationId: string = 'test-org',
  tier: string = 'open_source'
): string {
  // In real tests, this would call Nexus Auth to get a valid token
  // For now, return a mock token
  return Buffer.from(
    JSON.stringify({
      userId,
      organizationId,
      tier,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    })
  ).toString('base64');
}

// Register global setup/teardown hooks
before(async function () {
  this.timeout(30000); // Allow 30 seconds for setup
  await setupTests();
});

after(async function () {
  this.timeout(10000); // Allow 10 seconds for teardown
  await teardownTests();
});
