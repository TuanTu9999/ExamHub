// server/db/migrate.js
// ── Database migration script ──────────────────────────────

import 'dotenv/config';
import { query, pool } from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('🔄 Bắt đầu migration database...');
  
  try {
    // Đọc file schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Tách các câu lệnh SQL (split by semicolon)
    const statements = schema
      .split(';')
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim());
    
    let executed = 0;
    
    for (const statement of statements) {
      // Bỏ qua comments
      if (statement.startsWith('--')) continue;
      
      try {
        await query(statement);
        executed++;
        console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
      } catch (err) {
        // Bỏ qua lỗi table already exists
        if (!err.message.includes('already exists')) {
          console.warn(`⚠️  Warning: ${err.message}`);
        }
      }
    }
    
    console.log(`\n🎉 Migration hoàn tất! Đã thực thi ${executed} câu lệnh.`);
    
    // Kiểm tra kết quả
    const [tables] = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      ORDER BY table_name
    `, [process.env.DB_NAME || 'examhub']);
    
    console.log('\n📊 Các bảng đã tạo:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Chạy migration nếu được gọi trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export default migrate;
