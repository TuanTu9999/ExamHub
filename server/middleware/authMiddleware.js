// server/middleware/authMiddleware.js
// ── Xác thực JWT + phân quyền role ─────────────────────────

import jwt   from 'jsonwebtoken';
import { query } from '../config/db.js';

const SECRET = process.env.JWT_SECRET || 'fallback_dev_secret';

// ── Giải mã JWT và gắn req.user ─────────────────────────────
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Chưa đăng nhập. Vui lòng cung cấp token.' });
  }

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;                      // { id, username, email, role, premium }
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
      : 'Token không hợp lệ.';
    return res.status(401).json({ error: msg });
  }
}

// ── Yêu cầu role cụ thể ─────────────────────────────────────
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa xác thực.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Bạn không có quyền thực hiện thao tác này. Yêu cầu: [${roles.join(', ')}].`
      });
    }
    next();
  };
}

// ── Shorthand middlewares ────────────────────────────────────
export const requireAdmin   = [authenticate, requireRole('admin')];
export const requireTeacher = [authenticate, requireRole('admin', 'teacher')];
export const requireStudent = [authenticate, requireRole('admin', 'teacher', 'student')];

// ── Tạo JWT token ────────────────────────────────────────────
export function signToken(user) {
  return jwt.sign(
    {
      id      : user.id,
      username: user.username,
      email   : user.email,
      name    : user.name,
      initials: user.initials,
      role    : user.role,
      premium : !!user.premium,
    },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
}

// ── Lấy số token hiện tại từ DB ─────────────────────────────
export async function getUserTokens(userId) {
  const [[row]] = await query('SELECT tokens, role FROM users WHERE id = ?', [userId]);
  if (!row) return 0;
  if (row.role === 'admin') return Infinity;
  return row.tokens;
}

// ── Trừ token, trả về false nếu không đủ ────────────────────
export async function consumeTokens(userId, amount) {
  const tokens = await getUserTokens(userId);
  if (tokens === Infinity) return true;
  if (tokens < amount)    return false;
  await query('UPDATE users SET tokens = tokens - ? WHERE id = ?', [amount, userId]);
  return true;
}
