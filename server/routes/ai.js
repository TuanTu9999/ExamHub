// server/routes/ai.js
// ── Proxy AI (OpenRouter) với Redis cache + token deduction ──

import { Router }  from 'express';
import { query }   from '../config/db.js';
import { cacheGet, cacheSet, makeCacheKey } from '../config/db.js';
import { authenticate, consumeTokens }      from '../middleware/authMiddleware.js';

const router   = Router();
const BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const API_KEY  = process.env.OPENROUTER_API_KEY  || '';
const DEF_MODEL= process.env.OPENROUTER_MODEL    || 'deepseek/deepseek-chat';

// ── Lấy chi phí tính năng từ DB (với fallback hardcode) ──────
const COST_FALLBACK = {
  hint: 5, explain_answer: 8, generate_questions: 40,
  analyze_exam: 30, study_suggestion: 10, format_check: 3, explain_result: 15,
};

async function getFeatureCost(feature) {
  try {
    const [[row]] = await query(
      'SELECT cost FROM token_costs WHERE feature_key = ?', [feature]
    );
    return row?.cost ?? COST_FALLBACK[feature] ?? 10;
  } catch {
    return COST_FALLBACK[feature] ?? 10;
  }
}

// ── Gọi OpenRouter API (fetch) ────────────────────────────────
async function callOpenRouter(prompt, model = DEF_MODEL, maxTokens = 1500) {
  if (!API_KEY) throw new Error('Chưa cấu hình OPENROUTER_API_KEY trong .env');

  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method : 'POST',
    headers: {
      'Authorization' : `Bearer ${API_KEY}`,
      'Content-Type'  : 'application/json',
      'HTTP-Referer'  : 'https://examhub.vn',
      'X-Title'       : 'ExamHub',
    },
    body: JSON.stringify({
      model,
      max_tokens : maxTokens,
      messages   : [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenRouter lỗi ${resp.status}: ${txt.slice(0, 200)}`);
  }

  const data = await resp.json();
  return {
    text  : data.choices?.[0]?.message?.content || '',
    model : data.model || model,
    tokens: data.usage?.total_tokens || 0,
  };
}

// ════════════════════════════════════════════════════════════
//  POST /api/ai/chat
//  Body: { feature, prompt, model?, maxTokens?, skipCache? }
//  → Trả về { text, cached, tokensUsed }
// ════════════════════════════════════════════════════════════
router.post('/chat', authenticate, async (req, res) => {
  try {
    const {
      feature   = 'hint',
      prompt    = '',
      model     = DEF_MODEL,
      maxTokens = 1500,
      skipCache = false,
    } = req.body;

    if (!prompt) return res.status(400).json({ error: 'Prompt không được để trống.' });

    const userId = req.user.id;
    const role   = req.user.role;

    // ── 1. Kiểm tra + trừ token (admin miễn phí) ─────────────
    const cost = role === 'admin' ? 0 : await getFeatureCost(feature);
    if (cost > 0) {
      const ok = await consumeTokens(userId, cost);
      if (!ok) {
        const [[u]] = await query('SELECT tokens FROM users WHERE id = ?', [userId]);
        return res.status(402).json({
          error: `Không đủ token! Cần ${cost}, còn ${u?.tokens ?? 0}. Liên hệ Admin.`,
          tokensLeft: u?.tokens ?? 0,
        });
      }
    }

    // ── 2. Kiểm tra Redis cache (bỏ qua nếu skipCache) ───────
    const cacheKey = makeCacheKey(prompt, model);
    if (!skipCache) {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return res.json({ text: cached.text, cached: true, tokensUsed: 0 });
      }
    }

    // ── 3. Gọi AI ─────────────────────────────────────────────
    const result = await callOpenRouter(prompt, model, maxTokens);

    // ── 4. Lưu cache ─────────────────────────────────────────
    await cacheSet(cacheKey, { text: result.text, model: result.model, tokens: result.tokens });

    // ── 5. Trả kết quả ───────────────────────────────────────
    const [[{ tokens: tokensLeft }]] = await query(
      'SELECT tokens FROM users WHERE id = ?', [userId]
    );
    return res.json({
      text      : result.text,
      cached    : false,
      model     : result.model,
      tokensUsed: cost,
      tokensLeft: role === 'admin' ? null : tokensLeft,
    });

  } catch (err) {
    console.error('[ai/chat]', err.message);
    return res.status(500).json({ error: err.message || 'Lỗi khi gọi AI.' });
  }
});

// ════════════════════════════════════════════════════════════
//  POST /api/ai/generate-questions
//  Body: { subject, topic, count, difficulty, model? }
//  → Trả về { questions: [...], cached, tokensUsed }
// ════════════════════════════════════════════════════════════
router.post('/generate-questions', authenticate, async (req, res) => {
  try {
    const {
      subject    = 'Toán học THPT',
      topic      = 'Tổng hợp',
      count      = 5,
      difficulty = 'trung bình',
      model      = DEF_MODEL,
      skipCache  = false,
    } = req.body;

    const userId = req.user.id;
    const role   = req.user.role;

    // Token cost = hệ_số × count
    const costPer5 = await getFeatureCost('generate_questions');
    const cost     = role === 'admin' ? 0 : Math.round((costPer5 / 5) * count);

    if (cost > 0) {
      const ok = await consumeTokens(userId, cost);
      if (!ok) {
        const [[u]] = await query('SELECT tokens FROM users WHERE id = ?', [userId]);
        return res.status(402).json({
          error: `Không đủ token! Cần ${cost}, còn ${u?.tokens ?? 0}.`,
          tokensLeft: u?.tokens ?? 0,
        });
      }
    }

    const diffMap = {
      'dễ'        : 'DỄ (Nhận biết/Thông hiểu)',
      'trung bình': 'TRUNG BÌNH (Vận dụng)',
      'khó'       : 'KHÓ (Vận dụng cao)',
    };

    const prompt = `Bạn là giáo sư chuyên gia tạo câu hỏi trắc nghiệm cho kỳ thi THPT Quốc gia Việt Nam.
Môn: ${subject} | Chủ đề: ${topic} | Độ khó: ${diffMap[difficulty] || 'TRUNG BÌNH'}

LUẬT LATEX BẮT BUỘC:
- Toán học phải trong $...$
- Phân số: \\frac{tử}{mẫu} (CHỈ 1 dấu backslash)
- Không dùng ngoặc () thay cho {}

Trả về ĐÚNG ${count} câu dưới dạng JSON array thuần (không markdown, không backtick):
[{"text":"...","opts":["...","...","...","..."],"correct":0,"explanation":"..."}]`;

    const cacheKey = makeCacheKey(prompt, model);
    if (!skipCache) {
      const cached = await cacheGet(cacheKey);
      if (cached?.questions) {
        return res.json({ questions: cached.questions, cached: true, tokensUsed: 0 });
      }
    }

    const result = await callOpenRouter(prompt, model, 2500);

    // Parse JSON từ phản hồi AI
    let questions = [];
    try {
      const raw   = result.text;
      const start = raw.indexOf('[');
      const end   = raw.lastIndexOf(']');
      if (start !== -1 && end > start) {
        questions = JSON.parse(raw.slice(start, end + 1));
      }
    } catch (parseErr) {
      console.warn('AI JSON parse failed:', parseErr.message);
      return res.status(422).json({ error: 'AI trả về JSON không hợp lệ. Thử lại.', raw: result.text.slice(0, 300) });
    }

    await cacheSet(cacheKey, { questions, model: result.model });

    const [[{ tokens: tokensLeft }]] = await query(
      'SELECT tokens FROM users WHERE id = ?', [userId]
    );
    return res.json({
      questions,
      cached    : false,
      model     : result.model,
      tokensUsed: cost,
      tokensLeft: role === 'admin' ? null : tokensLeft,
    });

  } catch (err) {
    console.error('[ai/generate-questions]', err.message);
    return res.status(500).json({ error: err.message || 'Lỗi khi gọi AI.' });
  }
});

// GET /api/ai/token-balance  — Số token còn lại của tôi
router.get('/token-balance', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'admin') return res.json({ tokens: null, unlimited: true });
    const [[u]] = await query('SELECT tokens FROM users WHERE id = ?', [req.user.id]);
    return res.json({ tokens: u?.tokens ?? 0, unlimited: false });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server.' });
  }
});

export default router;
