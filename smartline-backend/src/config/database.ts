import { Pool, PoolConfig } from 'pg';
import { config } from './env';

// Connection pool configuration
const poolConfig: PoolConfig | null = config.DATABASE_URL ? {
  connectionString: config.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  min: 5, // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Fail fast if can't connect within 10 seconds

  // SSL configuration (required for Supabase)
  ssl: config.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
} : null;

// Create connection pool (only if DATABASE_URL is set)
export const pool = poolConfig ? new Pool(poolConfig) : null;

if (!pool) {
  console.warn('⚠️  DATABASE_URL not set - Direct database queries will fail. Using Supabase REST API only.');
}

// Handle pool errors
if (pool) {
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
  });
}

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  if (!pool) return false;
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Get pool statistics
export function getPoolStats() {
  if (!pool) return { total: 0, idle: 0, waiting: 0 };
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    console.log('Database pool closed');
  }
}

// Query helper with timeout
export async function query(text: string, params?: any[], timeout: number = 10000) {
  if (!pool) {
    throw new Error('Database pool not initialized. Set DATABASE_URL in environment variables.');
  }

  const start = Date.now();

  try {
    const client = await pool.connect();

    try {
      // Set statement timeout
      await client.query(`SET statement_timeout = ${timeout}`);

      const result = await client.query(text, params);
      const duration = Date.now() - start;

      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query (${duration}ms):`, text);
      }

      return result;
    } finally {
      client.release();
    }
  } catch (error: any) {
    const duration = Date.now() - start;
    console.error(`Query error (${duration}ms):`, error.message);
    throw error;
  }
}

// Transaction helper
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error('Database pool not initialized. Set DATABASE_URL in environment variables.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
