// VowsSite Database connection - SEPARATE from GridTVSports database
const { Pool } = require('pg');
require('dotenv').config();

// Validate VOWS_DATABASE_URL (separate from GridTVSports DATABASE_URL)
if (!process.env.VOWS_DATABASE_URL) {
  console.error('❌ ERROR: VOWS_DATABASE_URL is not set in .env file');
  console.log('Please add VOWS_DATABASE_URL to your .env file');
  console.log('Example: VOWS_DATABASE_URL=postgresql://user:password@host:5432/vows_database?sslmode=require');
  process.exit(1);
}

// Create PostgreSQL connection pool for VowsSite
const vowsPool = new Pool({
  connectionString: process.env.VOWS_DATABASE_URL,
  ssl: process.env.VOWS_DATABASE_URL.includes('sslmode=require') ? {
    rejectUnauthorized: false
  } : false
});

// Test connection
vowsPool.on('connect', () => {
  console.log('✅ VowsSite Database connected successfully');
});

vowsPool.on('error', (err) => {
  console.error('❌ VowsSite Database error:', err);
});

// Get all vows (both languages)
async function getAllVows() {
  const client = await vowsPool.connect();

  try {
    const query = `
      SELECT * FROM vows
      WHERE is_active = true
      ORDER BY person_type;
    `;

    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error fetching vows:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Save or update vows (upsert)
async function saveVows(groomNameEn, groomNamePt, groomVowsEn, groomVowsPt, brideNameEn, brideNamePt, brideVowsEn, brideVowsPt) {
  const client = await vowsPool.connect();

  try {
    await client.query('BEGIN');

    // Deactivate old vows
    await client.query('UPDATE vows SET is_active = false');

    // Insert new groom vows
    const groomQuery = `
      INSERT INTO vows (person_type, person_name_en, person_name_pt, vow_text_en, vow_text_pt, is_active)
      VALUES ('groom', $1, $2, $3, $4, true)
      RETURNING id;
    `;
    await client.query(groomQuery, [groomNameEn, groomNamePt, groomVowsEn, groomVowsPt]);

    // Insert new bride vows
    const brideQuery = `
      INSERT INTO vows (person_type, person_name_en, person_name_pt, vow_text_en, vow_text_pt, is_active)
      VALUES ('bride', $1, $2, $3, $4, true)
      RETURNING id;
    `;
    await client.query(brideQuery, [brideNameEn, brideNamePt, brideVowsEn, brideVowsPt]);

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving vows:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get unlock status
async function getUnlockStatus() {
  const client = await vowsPool.connect();

  try {
    const query = 'SELECT is_unlocked FROM unlock_status WHERE id = 1;';
    const result = await client.query(query);

    if (result.rows.length === 0) {
      return { is_unlocked: false };
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching unlock status:', error);
    return { is_unlocked: false };
  } finally {
    client.release();
  }
}

// Set unlock status
async function setUnlockStatus(isUnlocked) {
  const client = await vowsPool.connect();

  try {
    const query = `
      UPDATE unlock_status
      SET is_unlocked = $1,
          ${isUnlocked ? 'unlocked_at' : 'locked_at'} = NOW(),
          last_updated = NOW()
      WHERE id = 1
      RETURNING *;
    `;

    const result = await client.query(query, [isUnlocked]);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating unlock status:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Verify admin password
async function verifyAdminPassword(password) {
  const client = await vowsPool.connect();

  try {
    const query = `
      SELECT setting_value FROM admin_settings
      WHERE setting_key = 'admin_password';
    `;

    const result = await client.query(query);

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].setting_value === password;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  } finally {
    client.release();
  }
}

// Initialize VowsSite database tables
async function initializeVowsDatabase() {
  const client = await vowsPool.connect();

  try {
    console.log('🔧 Initializing VowsSite database tables...');

    // Read and execute schema file
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'vows-db-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schema);

    console.log('✅ VowsSite database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing VowsSite database:', error);
    return false;
  } finally {
    client.release();
  }
}

module.exports = {
  vowsPool,
  getAllVows,
  saveVows,
  getUnlockStatus,
  setUnlockStatus,
  verifyAdminPassword,
  initializeVowsDatabase,
};
