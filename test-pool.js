const { pool } = require('./db');

async function test() {
  try {
    console.log('Pool:', pool);
    const result = await pool.query('SELECT NOW()');
    console.log('Query result:', result.rows[0]);
    
    const statusResult = await pool.query('SELECT is_unlocked FROM unlock_status WHERE id = 1');
    console.log('Unlock status:', statusResult.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
