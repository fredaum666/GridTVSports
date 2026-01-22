require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixSequences() {
  console.log('🔧 Fixing TV table sequences...\n');

  try {
    // Fix tv_auth_tokens sequence
    console.log('Resetting tv_auth_tokens_id_seq...');
    await pool.query(`
      SELECT setval('tv_auth_tokens_id_seq', COALESCE((SELECT MAX(id) FROM tv_auth_tokens), 0) + 1, false);
    `);
    console.log('✅ tv_auth_tokens sequence fixed');

    // Fix tv_sessions sequence
    console.log('Resetting tv_sessions_id_seq...');
    await pool.query(`
      SELECT setval('tv_sessions_id_seq', COALESCE((SELECT MAX(id) FROM tv_sessions), 0) + 1, false);
    `);
    console.log('✅ tv_sessions sequence fixed');

    // Check current counts
    const authCount = await pool.query('SELECT COUNT(*) FROM tv_auth_tokens');
    const sessionsCount = await pool.query('SELECT COUNT(*) FROM tv_sessions');

    console.log(`\n📊 Current records:`);
    console.log(`   tv_auth_tokens: ${authCount.rows[0].count}`);
    console.log(`   tv_sessions: ${sessionsCount.rows[0].count}`);

    console.log('\n🎉 Sequences fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing sequences:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

fixSequences();
