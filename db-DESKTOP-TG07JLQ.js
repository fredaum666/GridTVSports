// Database connection and helper functions
const { Pool } = require('pg');
require('dotenv').config();

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set in .env file');
  console.log('Please create a .env file with your DATABASE_URL');
  console.log('Example: DATABASE_URL=postgresql://user@server:password@host:5432/database?sslmode=require');
  process.exit(1);
}

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('sslmode=require') ? {
    rejectUnauthorized: false
  } : false,
  // Ensure UTF-8 encoding for all connections
  client_encoding: 'UTF8'
});

// Test connection and set encoding
pool.on('connect', async (client) => {
  console.log('✅ Database connected successfully');
  try {
    await client.query("SET CLIENT_ENCODING TO 'UTF8'");
  } catch (err) {
    console.error('⚠️  Error setting client encoding:', err);
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// Helper function to save a game to the database
async function saveGame(gameData) {
  const client = await pool.connect();
  
  try {
    const query = `
      INSERT INTO games (
        id, sport, game_date, week_number, season, status,
        home_team, home_team_id, home_score,
        away_team, away_team_id, away_score,
        raw_data, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (id) 
      DO UPDATE SET
        status = EXCLUDED.status,
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score,
        raw_data = EXCLUDED.raw_data,
        last_updated = NOW()
      RETURNING id;
    `;
    
    const values = [
      gameData.id,
      gameData.sport,
      gameData.game_date,
      gameData.week_number || null,
      gameData.season,
      gameData.status,
      gameData.home_team,
      gameData.home_team_id,
      gameData.home_score,
      gameData.away_team,
      gameData.away_team_id,
      gameData.away_score,
      JSON.stringify(gameData.raw_data),
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error saving game:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get completed games from database (avoid API calls)
async function getCompletedGames(sport, startDate, endDate) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT * FROM games 
      WHERE sport = $1 
        AND status = 'completed'
        AND game_date BETWEEN $2 AND $3
      ORDER BY game_date DESC;
    `;
    
    const result = await client.query(query, [sport, startDate, endDate]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching completed games:', error);
    return [];
  } finally {
    client.release();
  }
}

// Get games by week (NFL only)
async function getGamesByWeek(week, season) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT * FROM games 
      WHERE sport = 'NFL' 
        AND week_number = $1 
        AND season = $2
      ORDER BY game_date;
    `;
    
    const result = await client.query(query, [week, season]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching games by week:', error);
    return [];
  } finally {
    client.release();
  }
}

// Get games by date (NBA, MLB, NHL)
async function getGamesByDate(sport, date) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT * FROM games 
      WHERE sport = $1 
        AND game_date = $2
      ORDER BY game_date;
    `;
    
    const result = await client.query(query, [sport, date]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching games by date:', error);
    return [];
  } finally {
    client.release();
  }
}

// Save team information
async function saveTeam(teamData) {
  const client = await pool.connect();
  
  try {
    const query = `
      INSERT INTO teams (
        id, sport, full_name, short_name, abbreviation,
        logo_url, primary_color, secondary_color
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) 
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        logo_url = EXCLUDED.logo_url,
        last_updated = NOW()
      RETURNING id;
    `;
    
    const values = [
      teamData.id,
      teamData.sport,
      teamData.full_name,
      teamData.short_name,
      teamData.abbreviation,
      teamData.logo_url,
      teamData.primary_color || null,
      teamData.secondary_color || null,
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error saving team:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get all teams for a sport
async function getTeamsBySport(sport) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT * FROM teams 
      WHERE sport = $1
      ORDER BY full_name;
    `;
    
    const result = await client.query(query, [sport]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  } finally {
    client.release();
  }
}

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Initializing database tables...');
    
    // Read and execute schema file
    const fs = require('fs');
    const schema = fs.readFileSync('./db-schema.sql', 'utf8');
    
    await client.query(schema);
    
    console.log('✅ Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    return false;
  } finally {
    client.release();
  }
}

// Clean up old games (optional - run periodically)
async function cleanupOldGames(daysToKeep = 30) {
  const client = await pool.connect();
  
  try {
    const query = `
      DELETE FROM games 
      WHERE game_date < NOW() - INTERVAL '${daysToKeep} days'
        AND status = 'completed';
    `;
    
    const result = await client.query(query);
    console.log(`🗑️ Cleaned up ${result.rowCount} old games`);
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning up old games:', error);
    return 0;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  saveGame,
  getCompletedGames,
  getGamesByWeek,
  getGamesByDate,
  saveTeam,
  getTeamsBySport,
  initializeDatabase,
  cleanupOldGames,
};
