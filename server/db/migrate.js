// server/db/migrate.js
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
    // Đọc file schema cho PostgreSQL
    const schemaPath = path.join(__dirname, 'schema.pg.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Chạy từng câu lệnh
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim().startsWith('--')) continue;
      try {
        await query(statement);
        console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.warn(`⚠️ Warning: ${err.message}`);
        }
      }
    }
    
    console.log('🎉 Migration hoàn tất!');
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
