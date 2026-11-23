import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from './schema/index';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

/**
 * Configure database connection pool for PostgreSQL & PgBouncer.
 *
 * In production with PgBouncer Transaction Pooling:
 * - Direct connection is used for migrations (DATABASE_DIRECT_URL)
 * - Application pooled connection is used for runtime queries (DATABASE_URL)
 */
function createPool(): Pool {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.DATABASE_DIRECT_URL ||
    'postgresql://postgres:postgres@localhost:5432/exitexam_prep';

  const poolConfig: PoolConfig = {
    connectionString,
    max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  // SSL enforcement when configured
  if (
    process.env.DATABASE_SSL === 'true' ||
    connectionString.includes('sslmode=require') ||
    connectionString.includes('sslmode=verify-full')
  ) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  return new Pool(poolConfig);
}

// In development, preserve pool instance across Hot Module Reloads (HMR)
const pool = global.__dbPool || createPool();
if (process.env.NODE_ENV !== 'production') {
  global.__dbPool = pool;
}

/**
 * Drizzle ORM Client Instance
 * Configured with full relational schema support and connection pooling.
 */
export const db: NodePgDatabase<typeof schema> = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === 'development' && process.env.DEBUG_DRIZZLE === 'true',
});

export { pool };

/**
 * Diagnostic database connection test utility.
 * Safely verifies network accessibility and query execution.
 */
export async function testDatabaseConnection(): Promise<{
  connected: boolean;
  timestamp?: string;
  error?: string;
}> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW() as current_time');
      return {
        connected: true,
        timestamp: res.rows[0]?.current_time?.toISOString(),
      };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message || (err as any).code || String(err)
        : String(err);
    return {
      connected: false,
      error: message || 'Connection refused or database unreachable',
    };
  }
}
