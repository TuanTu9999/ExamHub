// server/config/db.js
// ── Kết nối MySQL (pool) + Redis (ioredis) ──────────────────

import mysql   from 'mysql2/promise';
import Redis   from 'ioredis';
import dotenv  from 'dotenv';

dotenv.config();

// ── MySQL Pool ──────────────────────────────────────────────
export const pool = mysql.createPool({
  host              : process.env.DB_HOST     || 'localhost',
  port              : Number(process.env.DB_PORT) || 3306,
  user              : process.env.DB_USER     || 'root',
  password          : process.env.DB_PASS     || '',
  database          : process.env.DB_NAME     || 'examhub',
  waitForConnections: true,
  connectionLimit   : 20,
  queueLimit        : 0,
  charset           : 'utf8mb4',
  timezone          : '+07:00',              // UTC+7 (Việt Nam)
});

// Tiện ích truy vấn nhanh
export const query = (sql, params) => pool.execute(sql, params);

// Kiểm tra kết nối MySQL khi khởi động
export async function connectMySQL() {
  const conn = await pool.getConnection();
  console.log('✅ MySQL connected:', process.env.DB_HOST, '/', process.env.DB_NAME);
  conn.release();
}

// ── Redis Client ────────────────────────────────────────────
const redisConfig = {
  host     : process.env.REDIS_HOST || 'localhost',
  port     : Number(process.env.REDIS_PORT) || 6379,
  password : process.env.REDIS_PASS || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

export const redis = new Redis(redisConfig);

redis.on('connect',     () => console.log('✅ Redis connected'));
redis.on('error',  (err) => console.warn('⚠️  Redis error (cache disabled):', err.message));

// ── Cache helpers ───────────────────────────────────────────
const CACHE_TTL = Number(process.env.AI_CACHE_TTL) || 3600; // seconds

/**
 * Đọc cache AI từ Redis.
 * Nếu Redis down → trả về null (graceful degradation).
 */
export async function cacheGet(key) {
  try {
    const val = await redis.get(`ai:${key}`);
    if (val) {
      // Tăng hit_count trong MySQL (không đợi, fire-and-forget)
      query(
        'UPDATE ai_cache SET hit_count = hit_count + 1 WHERE cache_key = ?',
        [key]
      ).catch(() => {});
    }
    return val ? JSON.parse(val) : null;
  } catch {
    return null;                             // Redis down → không crash
  }
}

/**
 * Lưu kết quả AI vào Redis + MySQL backup.
 */
export async function cacheSet(key, value, ttl = CACHE_TTL) {
  try {
    await redis.setex(`ai:${key}`, ttl, JSON.stringify(value));
    // Backup vào MySQL (audit log)
    const expiresAt = new Date(Date.now() + ttl * 1000);
    await query(
      `INSERT INTO ai_cache (cache_key, prompt_hash, response_text, model, tokens_used, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE response_text=VALUES(response_text), hit_count=0, expires_at=VALUES(expires_at)`,
      [key, key, JSON.stringify(value), value.model || '', value.tokens || 0, expiresAt]
    );
  } catch (e) {
    console.warn('Cache set error:', e.message);
  }
}

/**
 * Tạo cache key từ nội dung prompt (SHA-256 đơn giản qua crypto).
 */
import { createHash } from 'crypto';
export function makeCacheKey(prompt, model = '') {
  return createHash('sha256').update(`${model}:${prompt}`).digest('hex');
}
