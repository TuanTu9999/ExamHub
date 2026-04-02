// server/routes/admin.js
// ── Quản trị: Người dùng, Token, Hệ số AI ───────────────────

import { Router }  from 'express';
import bcrypt      from 'bcryptjs';
import { query }   from '../config/db.js';
import { requireAdmin, requireTeacher } from '../middleware/authMiddleware.js';

const router = Router();

const SAFE_COLS = `id, username, email, name, initials, role,
                   premium, premium_expiry, tokens, is_active, created_at`;

// ════════════════════════════════════════════════════════════
//  QUẢN LÝ NGƯỜI DÙNG
// ════════════════════════════════════════════════════════════

// GET /api/admin/users  — Danh sách tất cả người dùng
router.get('/users', ...requireAdmin, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT ${SAFE_COLS} FROM users ORDER BY role ASC, created_at DESC`
    );
    return res.json({ users: rows });
  } catch (err) {
    console.error('[admin/users GET]', err);
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// POST /api/admin/users  — Tạo tài khoản mới (admin tạo thay)
router.post('/users', ...requireAdmin, async (req, res) => {
  try {
    const {
      name = '', username = '', email = '', password = '',
      role = 'student', tokens = 50, premium = false
    } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Thiếu name, username hoặc password.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải ≥ 6 ký tự.' });
    }
    if (!['student','teacher'].includes(role)) {
      return res.status(400).json({ error: 'Role phải là student hoặc teacher.' });
    }

    const lc = username.trim().toLowerCase();
    const em = (email || `${lc}@examhub.local`).toLowerCase();

    const [[exists]] = await query(
      'SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?', [lc, em]
    );
    if (exists) return res.status(409).json({ error: 'Username hoặc Email đã tồn tại.' });

    const parts    = name.trim().split(' ');
    const initials = ((parts[0]?.[0] || '') + (parts.at(-1)?.[0] || '')).toUpperCase() || 'U';
    const hash     = await bcrypt.hash(password, 12);
    const premExp  = premium ? new Date(Date.now() + 30 * 86400000) : null;

    const [result] = await query(
      `INSERT INTO users (username, email, password_hash, name, initials, role, tokens, premium, premium_expiry)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [lc, em, hash, name.trim(), initials, role, tokens, premium ? 1 : 0, premExp]
    );

    return res.status(201).json({ message: `Đã tạo tài khoản: ${name}`, userId: result.insertId });
  } catch (err) {
    console.error('[admin/users POST]', err);
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', ...requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[user]] = await query('SELECT role FROM users WHERE id = ?', [id]);
    if (!user)                return res.status(404).json({ error: 'Không tìm thấy user.' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Không thể xóa Admin.' });
    await query('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
    return res.json({ message: 'Đã vô hiệu hóa tài khoản.' });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ── Cấp token theo username/email ────────────────────────────
// POST /api/admin/users/grant-tokens
router.post('/users/grant-tokens', ...requireAdmin, async (req, res) => {
  try {
    const { ident = '', amount = 0 } = req.body;
    if (!ident || amount <= 0) {
      return res.status(400).json({ error: 'Cần ident và amount > 0.' });
    }

    const lc = ident.trim().toLowerCase();
    const [[user]] = await query(
      `SELECT id, name, role FROM users
       WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND is_active = 1 LIMIT 1`,
      [lc, lc]
    );
    if (!user)                return res.status(404).json({ error: `Không tìm thấy tài khoản: ${ident}` });
    if (user.role === 'admin') return res.json({ message: 'Admin có token không giới hạn.' });

    await query('UPDATE users SET tokens = tokens + ? WHERE id = ?', [amount, user.id]);
    const [[updated]] = await query('SELECT tokens FROM users WHERE id = ?', [user.id]);
    return res.json({
      message: `Đã cấp ${amount} token cho ${user.name}. Còn lại: ${updated.tokens}`,
      tokens: updated.tokens
    });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ── Cấp / Thu hồi Premium ────────────────────────────────────
// POST /api/admin/users/grant-premium
router.post('/users/grant-premium', ...requireAdmin, async (req, res) => {
  try {
    const { ident = '', grant = true, days = 30 } = req.body;
    const lc = ident.trim().toLowerCase();
    const [[user]] = await query(
      `SELECT id, name, premium_expiry FROM users
       WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND is_active = 1 LIMIT 1`,
      [lc, lc]
    );
    if (!user) return res.status(404).json({ error: `Không tìm thấy: ${ident}` });

    if (!grant) {
      await query('UPDATE users SET premium = 0, premium_expiry = NULL WHERE id = ?', [user.id]);
      return res.json({ message: `Đã thu hồi Premium của ${user.name}.` });
    }

    // Tính từ ngày expiry hiện tại (gia hạn nối tiếp)
    const base    = (user.premium_expiry && new Date(user.premium_expiry) > new Date())
      ? new Date(user.premium_expiry)
      : new Date();
    const expiry  = new Date(base.getTime() + days * 86400000);
    await query(
      'UPDATE users SET premium = 1, premium_expiry = ? WHERE id = ?',
      [expiry, user.id]
    );
    return res.json({
      message : `Đã gia hạn Premium ${days} ngày cho ${user.name}. Hết hạn: ${expiry.toLocaleDateString('vi-VN')}`,
      expiry
    });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ── Reset token về mặc định ──────────────────────────────────
// POST /api/admin/users/:id/reset-tokens
router.post('/users/:id/reset-tokens', ...requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[user]] = await query('SELECT role FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy.' });
    const def = user.role === 'teacher' ? 200 : 50;
    await query('UPDATE users SET tokens = ? WHERE id = ?', [def, id]);
    return res.json({ message: `Đã reset về ${def} token.`, tokens: def });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ════════════════════════════════════════════════════════════
//  CÀI ĐẶT CHI PHÍ TOKEN (TOKEN_COSTS)
// ════════════════════════════════════════════════════════════

// GET /api/admin/token-costs
router.get('/token-costs', ...requireTeacher, async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM token_costs ORDER BY feature_key');
    // Chuyển sang object { hint: 5, explain_answer: 8, ... }
    const costs = Object.fromEntries(rows.map(r => [r.feature_key, { cost: r.cost, label: r.label_vi }]));
    return res.json({ costs });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// PUT /api/admin/token-costs
// Body: { costs: { hint: 5, explain_answer: 8, ... }, genFactor: 8 }
router.put('/token-costs', ...requireAdmin, async (req, res) => {
  try {
    const { costs = {}, genFactor } = req.body;

    // Cập nhật từng feature
    const updates = Object.entries(costs).map(([key, val]) =>
      query(
        'UPDATE token_costs SET cost = ? WHERE feature_key = ?',
        [Math.max(0, parseInt(val) || 0), key]
      )
    );

    // Hệ số sinh câu hỏi → tính lại cho 5 câu
    if (genFactor !== undefined) {
      const cost5 = Math.max(1, parseInt(genFactor) || 8) * 5;
      updates.push(
        query(
          'UPDATE token_costs SET cost = ? WHERE feature_key = ?',
          [cost5, 'generate_questions']
        )
      );
    }

    await Promise.all(updates);
    return res.json({ message: 'Đã lưu cài đặt chi phí token!' });
  } catch (err) {
    console.error('[token-costs PUT]', err);
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ════════════════════════════════════════════════════════════
//  THỐNG KÊ DASHBOARD ADMIN
// ════════════════════════════════════════════════════════════
router.get('/stats', ...requireAdmin, async (req, res) => {
  try {
    const [[{ rooms }]]       = await query('SELECT COUNT(*) AS rooms FROM rooms');
    const [[{ exams }]]       = await query('SELECT COUNT(*) AS exams FROM exams');
    const [[{ questions }]]   = await query('SELECT COUNT(*) AS questions FROM questions');
    const [[{ users }]]       = await query("SELECT COUNT(*) AS users FROM users WHERE role = 'student' AND is_active = 1");
    const [[{ submissions }]] = await query('SELECT COUNT(*) AS submissions FROM submissions');
    const [[{ ai_generated }]]= await query("SELECT COUNT(*) AS ai_generated FROM questions WHERE source = 'ai'");
    return res.json({ stats: { rooms, exams, questions, users, submissions, ai_generated } });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

export default router;
