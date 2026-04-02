import mysql from 'mysql2/promise';
import pg from 'pg';
import dotenv from 'dotenv';
import { createHash } from 'crypto';

dotenv.config();

// Kiểm tra database type
const isPostgres = process.env.DB_HOST?.includes('render.com') || 
                   process.env.DATABASE_URL?.includes('postgresql');

let pool;
let queryFunction;

if (isPostgres) {
  // PostgreSQL connection (Render)
  const { Pool } = pg;
  
  pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
  });
  
  queryFunction = async (sql, params) => {
    try {
      const result = await pool.query(sql, params);
      return [result.rows, null];
    } catch (err) {
      console.error('PostgreSQL error:', err);
      throw err;
    }
  };
  
  console.log('✅ Using PostgreSQL (Render)');
} else {
  // MySQL connection (local)
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'examhub',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+07:00',
  });
  
  queryFunction = (sql, params) => pool.execute(sql, params);
  console.log('✅ Using MySQL (Local)');
}

// Export query function
export const query = queryFunction;
export { pool };

// Cache functions (đơn giản hóa cho production)
const CACHE_TTL = Number(process.env.AI_CACHE_TTL) || 3600;

export async function cacheGet(key) {
  // Tạm thời disable cache để tránh lỗi
  return null;
}

export async function cacheSet(key, value, ttl = CACHE_TTL) {
  // Tạm thời disable cache
  return true;
}

export function makeCacheKey(prompt, model = '') {
  return createHash('sha256').update(`${model}:${prompt}`).digest('hex');
}

export async function connectMySQL() {
  try {
    await pool.getConnection();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('Database connection error:', err);
  }
}
