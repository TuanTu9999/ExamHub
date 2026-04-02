// server/db/seed.js
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query, pool } from '../config/db.js';

async function seed() {
  console.log('🌱 Bắt đầu seed database...');
  
  try {
    // 1. Seed token costs (nếu chưa có)
    const costs = [
      ['hint', 5, '💡 Gợi ý bài thi'],
      ['explain_answer', 8, '🤖 Giải thích đáp án'],
      ['generate_questions', 40, '✨ Sinh câu hỏi (5 câu)'],
      ['analyze_exam', 30, '📄 Phân tích đề'],
      ['study_suggestion', 10, '💬 Gợi ý học tập'],
      ['format_check', 3, '🔍 Kiểm tra format'],
      ['explain_result', 15, '📊 Phân tích kết quả'],
    ];
    
    for (const [key, cost, label] of costs) {
      await query(
        `INSERT INTO token_costs (feature_key, cost, label_vi) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE cost = VALUES(cost), label_vi = VALUES(label_vi)`,
        [key, cost, label]
      );
    }
    console.log('✅ Token costs seeded');
    
    // 2. Seed demo users (nếu chưa có)
    const demoUsers = [
      {
        username: 'student',
        email: 'student@examhub.vn',
        password: '123456',
        name: 'Nguyễn Văn Học',
        role: 'student',
        tokens: 50
      },
      {
        username: 'teacher',
        email: 'teacher@examhub.vn',
        password: 'teacher1',
        name: 'Trần Thị Giáo',
        role: 'teacher',
        tokens: 200
      }
    ];
    
    for (const u of demoUsers) {
      const [[exists]] = await query('SELECT id FROM users WHERE username = ?', [u.username]);
      if (!exists) {
        const hash = await bcrypt.hash(u.password, 12);
        const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        await query(
          `INSERT INTO users (username, email, password_hash, name, initials, role, tokens) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [u.username, u.email, hash, u.name, initials, u.role, u.tokens]
        );
        console.log(`✅ Created demo user: ${u.username}`);
      }
    }
    
    // 3. Seed demo room
    const [[roomExists]] = await query('SELECT id FROM rooms LIMIT 1');
    if (!roomExists) {
      await query(
        `INSERT INTO rooms (name, description, subject, icon, status, premium) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Phòng thi mẫu', 'Phòng thi dành cho luyện tập', 'math', '📚', 'open', 0]
      );
      console.log('✅ Created demo room');
    }
    
    console.log('🎉 Seed hoàn tất!');
  } catch (err) {
    console.error('❌ Seed error:', err);
  } finally {
    await pool.end();
  }
}

seed();