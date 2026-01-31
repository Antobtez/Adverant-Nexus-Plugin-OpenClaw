/**
 * PostgreSQL Database Service
 *
 * Provides:
 * - Connection pool management
 * - Query execution helpers
 * - Transaction support
 * - Health check ping
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { createLogger } from '../utils/logger';
import { databaseQueryDuration, databaseConnectionsActive, databaseErrors } from '../utils/metrics';

const logger = createLogger({ component: 'database-service' });

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number; // Max pool size
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

export class DatabaseService {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      ssl: config.ssl,
    });

    // Pool error handler
    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error', { error: err });
      databaseErrors.inc({ operation: 'pool', error_type: err.name });
    });

    // Pool connection handler
    this.pool.on('connect', () => {
      logger.debug('New database connection established');
    });

    // Pool remove handler
    this.pool.on('remove', () => {
      logger.debug('Database connection removed from pool');
    });
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to database...');

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      logger.info('Database connection established');

      // Update metrics
      this.updateConnectionMetrics();
    } catch (error) {
      logger.error('Failed to connect to database', { error });
      databaseErrors.inc({ operation: 'connect', error_type: 'connection_failed' });
      throw error;
    }
  }

  /**
   * Close database connection pool
   */
  async disconnect(): Promise<void> {
    try {
      logger.info('Closing database connection pool...');
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Failed to close database pool', { error });
      throw error;
    }
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    const operation = this.extractOperation(text);

    try {
      logger.debug('Executing query', { operation, text: text.substring(0, 100) });

      const result = await this.pool.query<T>(text, params);

      const duration = (Date.now() - start) / 1000;
      databaseQueryDuration.observe({ operation, table: this.extractTable(text) }, duration);

      logger.debug('Query executed successfully', {
        operation,
        rows: result.rowCount,
        duration,
      });

      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      logger.error('Query execution failed', {
        error,
        operation,
        duration,
        text: text.substring(0, 100),
      });

      databaseErrors.inc({ operation, error_type: error instanceof Error ? error.name : 'unknown' });
      throw error;
    }
  }

  /**
   * Execute a query and return first row
   */
  async queryOne<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return all rows
   */
  async queryMany<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    const start = Date.now();

    try {
      logger.debug('Starting transaction');
      await client.query('BEGIN');

      const result = await callback(client);

      await client.query('COMMIT');
      const duration = (Date.now() - start) / 1000;

      logger.debug('Transaction committed', { duration });
      databaseQueryDuration.observe({ operation: 'transaction', table: 'all' }, duration);

      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      logger.error('Transaction failed, rolling back', { error, duration });

      await client.query('ROLLBACK');
      databaseErrors.inc({ operation: 'transaction', error_type: 'rollback' });

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a parameterized query with named parameters
   */
  async namedQuery<T extends QueryResultRow = any>(
    text: string,
    namedParams: Record<string, any>
  ): Promise<QueryResult<T>> {
    // Convert named parameters to positional parameters
    let index = 1;
    const params: any[] = [];
    const paramMap = new Map<string, number>();

    const query = text.replace(/:(\w+)/g, (match, name) => {
      if (!paramMap.has(name)) {
        paramMap.set(name, index++);
        params.push(namedParams[name]);
      }
      return `$${paramMap.get(name)}`;
    });

    return this.query<T>(query, params);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();

    try {
      await this.query('SELECT 1');
      const latency = Date.now() - start;

      logger.debug('Database health check passed', { latency });
      return { healthy: true, latency };
    } catch (error) {
      const latency = Date.now() - start;
      logger.error('Database health check failed', { error, latency });

      return {
        healthy: false,
        latency,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    total: number;
    idle: number;
    waiting: number;
  } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /**
   * Update connection metrics
   */
  private updateConnectionMetrics(): void {
    const stats = this.getPoolStats();
    databaseConnectionsActive.set({ pool: 'postgres' }, stats.total - stats.idle);
  }

  /**
   * Extract operation type from SQL query
   */
  private extractOperation(query: string): string {
    const match = query.trim().match(/^(\w+)/i);
    return match ? match[1].toUpperCase() : 'UNKNOWN';
  }

  /**
   * Extract table name from SQL query
   */
  private extractTable(query: string): string {
    const match = query.match(/(?:FROM|INTO|UPDATE)\s+([a-z_]+)/i);
    return match ? match[1] : 'unknown';
  }

  /**
   * Get the underlying pool (for advanced use cases)
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

// Singleton instance (can be configured later)
let databaseService: DatabaseService | null = null;

export function initializeDatabaseService(config: DatabaseConfig): DatabaseService {
  if (databaseService) {
    logger.warn('Database service already initialized, returning existing instance');
    return databaseService;
  }

  databaseService = new DatabaseService(config);
  return databaseService;
}

export function getDatabaseService(): DatabaseService {
  if (!databaseService) {
    throw new Error('Database service not initialized. Call initializeDatabaseService first.');
  }
  return databaseService;
}

export default DatabaseService;
