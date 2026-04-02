// server/routes/exams.js
// ── Đề thi, Câu hỏi, Bài làm (Submissions) ──────────────────

import { Router }  from 'express';
import { query }   from '../config/db.js';
import {
  authenticate, requireAdmin, requireTeacher, consumeTokens
} from '../middleware/authMiddleware.js';

const router = Router();

// ════════════════════════════════════════════════════════════
//  ĐỀ THI (EXAMS)
// ════════════════════════════════════════════════════════════

// GET /api/exams?roomId=1
router.get('/', authenticate, async (req, res) => {
  try {
    const { roomId } = req.query;
    let sql    = `SELECT e.*, COUNT(eq.question_id) AS question_count
                  FROM exams e
                  LEFT JOIN exam_questions eq ON eq.exam_id = e.id`;
    const params = [];
    if (roomId) { sql += ' WHERE e.room_id = ?'; params.push(roomId); }
    sql += ' GROUP BY e.id ORDER BY e.created_at DESC';
    const [exams] = await query(sql, params);
    return res.json({ exams });
  } catch (err) { return res.status(500).json({ error: 'Lỗi server.' }); }
});

// GET /api/exams/:id  — Chi tiết đề + danh sách câu hỏi
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[exam]] = await query('SELECT * FROM exams WHERE id = ?', [id]);
    if (!exam) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });

    const [questions] = await query(
      `SELECT q.*, eq.order_num, eq.score AS exam_score
       FROM questions q
       JOIN exam_questions eq ON eq.question_id = q.id
       WHERE eq.exam_id = ?
       ORDER BY eq.order_num ASC`,
      [id]
    );
    return res.json({ exam, questions });
  } catch (err) { return res.status(500).json({ error: 'Lỗi server.' }); }
});

// POST /api/exams
router.post('/', ...requireTeacher, async (req, res) => {
  try {
    const {
      name, room_id = null, description = '', author = '',
      duration_min = 90, exam_type = 'trial', exam_date = null,
      start_time = null, end_time = null, scoring_method = 'raw',
      is_premium = false, question_ids = []
    } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên đề thi là bắt buộc.' });

    const [result] = await query(
      `INSERT INTO exams (name, room_id, description, author, duration_min, exam_type,
                          exam_date, start_time, end_time, scoring_method, is_premium, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, room_id, description, author || req.user.name, duration_min, exam_type,
       exam_date, start_time, end_time, scoring_method, is_premium ? 1 : 0, req.user.id]
    );
    const examId = result.insertId;

    // Gán câu hỏi vào đề
    if (question_ids.length) {
      const rows = question_ids.map((qid, i) => [examId, qid, i + 1, 1.0]);
      await query(
        'INSERT INTO exam_questions (exam_id, question_id, order_num, score) VALUES ?',
        [rows]
      );
    }

    const [[exam]] = await query('SELECT * FROM exams WHERE id = ?', [examId]);
    return res.status(201).json({ message: 'Đã tạo đề thi!', exam });
  } catch (err) {
    console.error('[exams POST]', err);
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// PUT /api/exams/:id
router.put('/:id', ...requireTeacher, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[exam]] = await query('SELECT * FROM exams WHERE id = ?', [id]);
    if (!exam) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });
    const { question_ids, ...fields } = req.body;
    const allowed = ['name','room_id','description','author','duration_min','exam_type',
                     'exam_date','start_time','end_time','scoring_method','is_premium'];
    const sets = [], vals = [];
    for (const k of allowed) {
      if (k in fields) { sets.push(`${k} = ?`); vals.push(fields[k]); }
    }
    if (sets.length) {
      vals.push(id);
      await query(`UPDATE exams SET ${sets.join(', ')} WHERE id = ?`, vals);
    }
    if (question_ids !== undefined) {
      await query('DELETE FROM exam_questions WHERE exam_id = ?', [id]);
      if (question_ids.length) {
        const rows = question_ids.map((qid, i) => [id, qid, i + 1, 1.0]);
        await query(
          'INSERT INTO exam_questions (exam_id, question_id, order_num, score) VALUES ?',
          [rows]
        );
      }
    }
    const [[updated]] = await query('SELECT * FROM exams WHERE id = ?', [id]);
    return res.json({ message: 'Đã cập nhật đề thi!', exam: updated });
  } catch (err) { return res.status(500).json({ error: 'Lỗi server.' }); }
});

// DELETE /api/exams/:id
router.delete('/:id', ...requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM exams WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Đã xóa đề thi.' });
  } catch (err) { return res.status(500).json({ error: 'Lỗi server.' }); }
});

// ════════════════════════════════════════════════════════════
//  CÂU HỎI (QUESTIONS)
// ════════════════════════════════════════════════════════════

// GET /api/exams/questions?subject=math&difficulty=hard&page=1&limit=20
router.get('/questions/list', authenticate, async (req, res) => {
  try {
    const { subject, difficulty, source, q = '', page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM questions WHERE 1=1';
    const params = [];
    if (subject)    { sql += ' AND subject = ?';    params.push(subject); }
    if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }
    if (source)     { sql += ' AND source = ?';     params.push(source); }
    if (q)          { sql += ' AND text_md LIKE ?'; params.push(`%${q}%`); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));
    const [questions] = await query(sql, params);
    return res.json({ questions });
  } catch (err) { return res.status(500).json({ error: 'Lỗi server.' }); }
});

// POST /api/exams/questions
router.post('/questions', ...requireTeacher, async (req, res) => {
  try {
    const {
      code = null, text_md, subject = 'math', difficulty = 'medium',
      qtype = 'single', qtype_label = null,
      opts_json = null, correct = null, corrects_json = null,
      subqs_json = null, answer_short = null,
      sol_text = null, sol_video = null, img_b64 = null,
      irt_a = 1.0, irt_b = 0.0, irt_c = 0.25,
      default_score = 1.0, source = 'manual',
    } = req.body;
    if (!text_md) return res.status(400).json({ error: 'Nội dung câu hỏi là bắt buộc.' });

    const [result] = await query(
      `INSERT INTO questions
         (code, text_md, img_b64, subject, difficulty, qtype, qtype_label,
          opts_json, correct, corrects_json, subqs_json, answer_short,
          sol_text, sol_video, irt_a, irt_b, irt_c, default_score, source, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, text_md, img_b64, subject, difficulty, qtype, qtype_label,
       JSON.stringify(opts_json), correct, JSON.stringify(corrects_json),
       JSON.stringify(subqs_json), answer_short,
       sol_text, sol_video, irt_a, irt_b, irt_c, default_score, source, req.user.id]
    );
    const [[q]] = await query('SELECT * FROM questions WHERE id = ?', [result.insertId]);
    return res.status(201).json({ message: 'Đã thêm câu hỏi!', question: q });
  } catch (err) {
    console.error('[questions POST]', err);
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// PUT /api/exams/questions/:id
router.put('/questions/:id', ...requireTeacher, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { opts_json, corrects_json, subqs_json, ...rest } = req.body;
    const allowed = ['code','text_md','img_b64','subject','difficulty','qtype','qtype_label',
                     'correct','answer_short','sol_text','sol_video','irt_a','irt_b','irt_c','default_score'];
    const sets = [], vals = [];
    for (const k of allowed) {
      if (k in rest) { sets.push(`${k} = ?`); vals.push(rest[k]); }
    }
    if (opts_json !== undefined)     { sets.push('opts_json = ?');     vals.push(JSON.stringify(opts_json)); }
    if (corrects_json !== undefined) { sets.push('corrects_json = ?'); vals.push(JSON.stringify(corrects_json)); }
    if (subqs_json !== undefined)    { sets.push('subqs_json = ?');    vals.push(JSON.stringify(subqs_json)); }
    if (!sets.length) return res.status(400).json({ error: 'Không có gì để cập nhật.' });
    vals.push(id);
    await query(`UPDATE questions SET ${sets.join(', ')} WHERE id = ?`, vals);
    const [[q]] = await query('SELECT * FROM questions WHERE id = ?', [id]);
    return res.json({ message: 'Đã cập nhật câu hỏi!', question: q });
  } catch (err) { return res.status(500).json({ error: 'Lỗi server.' }); }
});

// DELETE /api/exams/questions/:id
router.delete('/questions/:id', ...requireTeacher, async (req, res) => {
  try {
    await query('DELETE FROM questions WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Đã xóa câu hỏi.' });
  } catch (err) { return res.status(500).json({ error: 'Lỗi server.' }); }
});

// ════════════════════════════════════════════════════════════
//  BÀI LÀM (SUBMISSIONS)
// ════════════════════════════════════════════════════════════

// GET /api/exams/submissions/my  — Lịch sử thi của tôi
router.get('/submissions/my', authenticate, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT s.*, e.name AS exam_name_ref, r.subject AS room_subject
       FROM submissions s
       LEFT JOIN exams e ON e.id = s.exam_id
       LEFT JOIN rooms r ON r.id = e.room_id
       WHERE s.user_id = ? AND s.is_trial = 0
       ORDER BY s.submitted_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    return res.json({ submissions: rows });
  } catch (err) { return res.status(500).json({ error: 'Lỗi server.' }); }
});

// POST /api/exams/submissions  — Nộp bài
router.post('/submissions', authenticate, async (req, res) => {
  try {
    const {
      exam_id, exam_name = '', subject = '', score, correct_count,
      total_questions, time_taken = '', answers_json = {}, is_trial = false
    } = req.body;

    const [result] = await query(
      `INSERT INTO submissions
         (user_id, exam_id, exam_name, subject, score, correct_count,
          total_questions, time_taken, answers_json, is_trial)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, exam_id || null, exam_name, subject,
       score, correct_count, total_questions, time_taken,
       JSON.stringify(answers_json), is_trial ? 1 : 0]
    );
    return res.status(201).json({ message: 'Đã lưu kết quả!', submissionId: result.insertId });
  } catch (err) {
    console.error('[submissions POST]', err);
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

// GET /api/exams/:examId/leaderboard
router.get('/:examId/leaderboard', authenticate, async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT u.name, u.initials, s.score, s.correct_count, s.time_taken, s.submitted_at
       FROM submissions s
       JOIN users u ON u.id = s.user_id
       WHERE s.exam_id = ? AND s.is_trial = 0
       ORDER BY s.score DESC, s.time_taken ASC
       LIMIT 20`,
      [req.params.examId]
    );
    return res.json({ leaderboard: rows });
  } catch (err) { return res.status(500).json({ error: 'Lỗi server.' }); }
});

export default router;
