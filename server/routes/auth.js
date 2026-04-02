import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { signToken, authenticate } from '../middleware/authMiddleware.js';

const router = Router();

const SAFE_COLS = `id, username, email, name, initials, role, premium,
                   premium_expiry, tokens, avatar_url, created_at`;

router.post('/login', async (req, res) => {
  try {
    const { ident = '', password = '' } = req.body;
    if (!ident || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập/email và mật khẩu.' });
    }

    const lc = ident.trim().toLowerCase();
    const [[user]] = await query(
      `SELECT ${SAFE_COLS}, password_hash FROM users
       WHERE (LOWER(username) = $1 OR LOWER(email) = $2) AND is_active = 1
       LIMIT 1`,
      [lc, lc]
    );

    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập/Email không tồn tại.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Mật khẩu không đúng.' });
    }

    const { password_hash, ...safeUser } = user;
    const token = signToken(safeUser);

    return res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Lỗi server. Vui lòng thử lại.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name = '', username = '', email = '', password = '', role = 'student' } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email không hợp lệ.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải ≥ 6 ký tự.' });
    }
    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ.' });
    }

    const lc = username.trim().toLowerCase();
    const [[exists]] = await query(
      'SELECT id FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $2 LIMIT 1',
      [lc, email.toLowerCase()]
    );
    if (exists) {
      return res.status(409).json({ error: 'Tên đăng nhập hoặc Email đã tồn tại.' });
    }

    const parts = name.trim().split(' ');
    const initials = ((parts[0]?.[0] || '') + (parts.at(-1)?.[0] || '')).toUpperCase() || 'U';
    const hash = await bcrypt.hash(password, 12);
    const defTokens = role === 'teacher' ? 200 : 50;

    const [result] = await query(
      `INSERT INTO users (username, email, password_hash, name, initials, role, tokens)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [lc, email.toLowerCase(), hash, name.trim(), initials, role, defTokens]
    );

    return res.status(201).json({
      message: 'Đăng ký thành công! Vui lòng đăng nhập.',
      userId: result.insertId,
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const [[user]] = await query(
      `SELECT ${SAFE_COLS} FROM users WHERE id = $1 AND is_active = 1 LIMIT 1`,
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại.' });
    return res.json({ user });
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải ≥ 6 ký tự.' });
    }
    const [[row]] = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!await bcrypt.compare(oldPassword, row.password_hash)) {
      return res.status(401).json({ error: 'Mật khẩu cũ không đúng.' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    return res.json({ message: 'Đã đổi mật khẩu thành công.' });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

export default router;
