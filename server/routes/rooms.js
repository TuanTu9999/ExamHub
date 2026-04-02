// server/routes/rooms.js
// ── Phòng thi: CRUD + danh sách đề thi trong phòng ──────────

import { Router } from 'express';
import { query }  from '../config/db.js';
import {
  authenticate, requireAdmin, requireTeacher
} from '../middleware/authMiddleware.js';

const router = Router();

// ── GET /api/rooms  — Danh sách phòng thi ────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { subject, status } = req.query;
    let sql  = 'SELECT * FROM rooms WHERE 1=1';
    const params = [];

    if (subject) { sql += ' AND subject = ?';    params.push(subject); }
    if (status)  { sql += ' AND status = ?';     params.push(status); }

    // Học sinh free không thấy phòng premium
    if (req.user.role === 'student' && !req.user.premium) {
      sql += ' AND premium = 0';
    }

    sql += ' ORDER BY created_at DESC';
    const [rooms] = await query(sql, params);
    return res.json({ rooms });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ── GET /api/rooms/:id ────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [[room]] = await query('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
    if (!room) return res.status(404).json({ error: 'Không tìm thấy phòng thi.' });

    // Kiểm tra quyền truy cập premium
    if (room.premium && !req.user.premium && req.user.role === 'student') {
      return res.status(403).json({ error: 'Phòng thi này yêu cầu tài khoản Premium.' });
    }

    // Lấy danh sách đề thi trong phòng
    const [exams] = await query(
      `SELECT e.id, e.name, e.duration_min, e.exam_type, e.exam_date,
              e.start_time, e.end_time, e.description, e.author,
              COUNT(eq.question_id) AS question_count
       FROM exams e
       LEFT JOIN exam_questions eq ON eq.exam_id = e.id
       WHERE e.room_id = ?
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [room.id]
    );

    return res.json({ room, exams });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ── POST /api/rooms  (admin/teacher) ─────────────────────────
router.post('/', ...requireTeacher, async (req, res) => {
  try {
    const {
      name, description = '', subject = 'math', icon = '📚',
      status = 'open', premium = false, color = 'var(--acc-s)',
      open_at = null, close_at = null
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Tên phòng là bắt buộc.' });

    const [result] = await query(
      `INSERT INTO rooms (name, description, subject, icon, status, premium, color, open_at, close_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, subject, icon, status, premium ? 1 : 0, color, open_at, close_at, req.user.id]
    );
    const [[room]] = await query('SELECT * FROM rooms WHERE id = ?', [result.insertId]);
    return res.status(201).json({ message: 'Đã tạo phòng thi mới!', room });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ── PUT /api/rooms/:id ────────────────────────────────────────
router.put('/:id', ...requireTeacher, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[room]] = await query('SELECT * FROM rooms WHERE id = ?', [id]);
    if (!room) return res.status(404).json({ error: 'Không tìm thấy phòng thi.' });

    const {
      name       = room.name,
      description= room.description,
      subject    = room.subject,
      icon       = room.icon,
      status     = room.status,
      premium    = room.premium,
      color      = room.color,
      open_at    = room.open_at,
      close_at   = room.close_at,
    } = req.body;

    await query(
      `UPDATE rooms SET name=?, description=?, subject=?, icon=?, status=?,
                        premium=?, color=?, open_at=?, close_at=?
       WHERE id = ?`,
      [name, description, subject, icon, status, premium ? 1 : 0, color, open_at, close_at, id]
    );
    const [[updated]] = await query('SELECT * FROM rooms WHERE id = ?', [id]);
    return res.json({ message: 'Đã cập nhật phòng thi!', room: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ── DELETE /api/rooms/:id ─────────────────────────────────────
router.delete('/:id', ...requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await query('DELETE FROM rooms WHERE id = ?', [id]);
    return res.json({ message: 'Đã xóa phòng thi.' });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

export default router;
