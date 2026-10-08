import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import fs from 'fs';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

function resolveSqlHost(): string | undefined {
  const host = process.env.SQL_HOST;
  if (!host) return undefined;

  // In Google Cloud Run, Cloud SQL unix socket is mounted at /cloudsql/INSTANCE
  // whereas development container uses /app/cloudsql/INSTANCE
  if (host.startsWith('/app/cloudsql/')) {
    const cloudRunPath = host.replace('/app/cloudsql/', '/cloudsql/');
    if (fs.existsSync(cloudRunPath)) {
      return cloudRunPath;
    }
  }
  return host;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const resolvedHost = resolveSqlHost();
    global._postgresPool = new Pool({
      host: resolvedHost,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
export * from './schema.ts';
