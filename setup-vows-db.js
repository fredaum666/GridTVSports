// Setup script to initialize vows database tables
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require') ? {
    rejectUnauthorized: false
  } : false
});

async function setupVowsDatabase() {
  try {
    console.log('🔧 Setting up vows database tables...');
    
    // Read the schema file
    const schema = fs.readFileSync('./VowsSite/vows-db-schema.sql', 'utf8');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('✅ Vows database tables created successfully!');
    console.log('');
    console.log('Created tables:');
    console.log('  - vows (for storing wedding vows)');
    console.log('  - unlock_status (for tracking vows visibility)');
    console.log('  - admin_settings (for admin configuration)');
    console.log('');
    console.log('Default admin password: wedding2024');
    console.log('Default unlock status: locked');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

setupVowsDatabase();
