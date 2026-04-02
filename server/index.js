// server/index.js
// ── ExamHub Backend — Express + MySQL + Redis ────────────────
//
//  Khởi động: npm run dev   (nodemon)
//             npm start     (production)
//  Seed DB:   npm run seed

import 'dotenv/config';
import express        from 'express';
import cors           from 'cors';
import helmet         from 'helmet';
import morgan         from 'morgan';
import rateLimit      from 'express-rate-limit';

import { connectMySQL, redis } from './config/db.js';
import authRoutes     from './routes/auth.js';
import adminRoutes    from './routes/admin.js';
import roomRoutes     from './routes/rooms.js';
import examRoutes     from './routes/exams.js';
import aiRoutes       from './routes/ai.js';

const app  = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ── Bảo mật cơ bản ───────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin     : process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));    // 10MB cho ảnh base64
app.use(express.urlencoded({ extended: true }));

// ── Logging ──────────────────────────────────────────────────
app.use(morgan(isProd ? 'combined' : 'dev'));

// ── Rate limiting ─────────────────────────────────────────────
const globalLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 phút
  max     : 300,
  message : { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
});

const authLimit = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 phút
  max     : 20,               // 20 lần đăng nhập / 10 phút
  message : { error: 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau 10 phút.' },
});

const aiLimit = rateLimit({
  windowMs: 60 * 1000,        // 1 phút
  max     : 15,               // 15 AI calls / phút / IP
  message : { error: 'Gọi AI quá nhanh. Vui lòng chờ 1 phút.' },
});

app.use(globalLimit);

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',   authLimit,  authRoutes);
app.use('/api/admin',             adminRoutes);
app.use('/api/rooms',             roomRoutes);
app.use('/api/exams',             examRoutes);
app.use('/api/ai',    aiLimit,    aiRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  let redisOk = false;
  try { await redis.ping(); redisOk = true; } catch {}
  return res.json({
    status : 'ok',
    env    : process.env.NODE_ENV,
    redis  : redisOk,
    time   : new Date().toISOString(),
  });
});

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route không tồn tại: ${req.method} ${req.path}` });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[UNHANDLED]', err);
  res.status(500).json({ error: isProd ? 'Lỗi server nội bộ.' : err.message });
});

// ── Seed admin lần đầu + Khởi động ──────────────────────────
async function seedAdminIfNeeded() {
  const { query } = await import('./config/db.js');
  const bcrypt    = (await import('bcryptjs')).default;

  const [[existing]] = await query(
    "SELECT id FROM users WHERE username = ? LIMIT 1",
    [process.env.ADMIN_USERNAME || 'admin']
  );
  if (existing) return;   // đã có rồi

  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'TuanTu3008@ExamHub', 12);
  await query(
    `INSERT INTO users (username, email, password_hash, name, initials, role, premium, tokens)
     VALUES (?, ?, ?, ?, 'AD', 'admin', 1, 999999)`,
    [
      process.env.ADMIN_USERNAME || 'admin',
      process.env.ADMIN_EMAIL    || 'admin@examhub.vn',
      hash,
      process.env.ADMIN_NAME     || 'Admin Hệ Thống',
    ]
  );
  console.log('✅ Tài khoản admin mặc định đã được tạo.');
}

async function main() {
  await connectMySQL();
  await redis.connect().catch(() => console.warn('⚠️  Redis không kết nối được — cache tắt.'));
  await seedAdminIfNeeded();

  app.listen(PORT, () => {
    console.log(`\n🚀 ExamHub Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📊 Môi trường: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database:   ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);
  });
}

main().catch(err => {
  console.error('❌ Không thể khởi động server:', err);
  process.exit(1);
});
