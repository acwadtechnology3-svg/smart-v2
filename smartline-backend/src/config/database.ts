import { Pool, PoolConfig } from 'pg';
import { config } from './env';

// Connection pool configuration
const poolConfig: PoolConfig = {
  connectionString: config.DATABASE_URL || config.SUPABASE_URL.replace('https://', 'postgresql://postgres:'),
  max: 20, // Maximum number of clients in the pool
  min: 5, // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Fail fast if can't connect within 10 seconds

  // SSL configuration (required for Supabase)
  ssl: config.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
};

// Create connection pool
export const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
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
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database pool closed');
}

// Query helper with timeout
export async function query(text: string, params?: any[], timeout: number = 10000) {
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
