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
  } : false
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
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

// ============================================
// GAME REPLAY FUNCTIONS (Drives & Plays)
// ============================================

/**
 * Save drives for a game (upsert with deduplication)
 * @param {string} gameId - ESPN game ID
 * @param {string} sport - 'nfl' or 'ncaa'
 * @param {Array} drivesData - Array of parsed drive objects
 * @returns {Array} - Array of saved drive IDs
 */
async function saveDrives(gameId, sport, drivesData) {
  const client = await pool.connect();

  try {
    const savedDrives = [];

    for (const drive of drivesData) {
      const query = `
        INSERT INTO game_drives (
          game_id, sport, drive_sequence, team_abbr, team_id,
          start_period, start_clock, start_yard,
          end_period, end_clock, end_yard,
          result, is_scoring, play_count, yards_gained,
          time_of_possession, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (game_id, drive_sequence)
        DO UPDATE SET
          team_abbr = EXCLUDED.team_abbr,
          end_period = EXCLUDED.end_period,
          end_clock = EXCLUDED.end_clock,
          end_yard = EXCLUDED.end_yard,
          result = EXCLUDED.result,
          is_scoring = EXCLUDED.is_scoring,
          play_count = EXCLUDED.play_count,
          yards_gained = EXCLUDED.yards_gained,
          time_of_possession = EXCLUDED.time_of_possession,
          raw_data = EXCLUDED.raw_data
        RETURNING id, drive_sequence;
      `;

      const values = [
        gameId,
        sport,
        drive.drive_sequence,
        drive.team_abbr || null,
        drive.team_id || null,
        drive.start_period || null,
        drive.start_clock || null,
        drive.start_yard || null,
        drive.end_period || null,
        drive.end_clock || null,
        drive.end_yard || null,
        drive.result || null,
        drive.is_scoring || false,
        drive.play_count || 0,
        drive.yards_gained || 0,
        drive.time_of_possession || null,
        drive.raw_data ? JSON.stringify(drive.raw_data) : null
      ];

      const result = await client.query(query, values);
      savedDrives.push(result.rows[0]);
    }

    return savedDrives;
  } catch (error) {
    console.error('Error saving drives:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Save plays for a game (upsert with deduplication)
 * @param {string} gameId - ESPN game ID
 * @param {string} sport - 'nfl' or 'ncaa'
 * @param {Array} playsData - Array of parsed play objects
 * @param {Map} driveIdMap - Map of drive_sequence -> database drive_id
 * @returns {number} - Number of plays saved
 */
async function savePlays(gameId, sport, playsData, driveIdMap = new Map()) {
  const client = await pool.connect();

  try {
    let savedCount = 0;

    for (const play of playsData) {
      const driveId = driveIdMap.get(play.drive_sequence) || null;

      const query = `
        INSERT INTO game_plays (
          game_id, drive_id, espn_play_id, sport, play_sequence, drive_play_sequence,
          period, clock, start_yard, end_yard, yards_gained,
          down, distance, down_distance_text, possession_text,
          start_down_distance_text, start_possession_text,
          play_type, play_text,
          possession_team_abbr, possession_team_id,
          is_scoring, score_value, away_score, home_score,
          is_touchdown, is_turnover, turnover_type,
          is_penalty, penalty_yards,
          animation_type, animation_data, raw_data
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
        )
        ON CONFLICT (game_id, play_sequence)
        DO UPDATE SET
          play_text = EXCLUDED.play_text,
          start_yard = EXCLUDED.start_yard,
          end_yard = EXCLUDED.end_yard,
          yards_gained = EXCLUDED.yards_gained,
          down = EXCLUDED.down,
          distance = EXCLUDED.distance,
          down_distance_text = EXCLUDED.down_distance_text,
          possession_text = EXCLUDED.possession_text,
          start_down_distance_text = EXCLUDED.start_down_distance_text,
          start_possession_text = EXCLUDED.start_possession_text,
          away_score = EXCLUDED.away_score,
          home_score = EXCLUDED.home_score,
          is_scoring = EXCLUDED.is_scoring,
          is_touchdown = EXCLUDED.is_touchdown,
          is_turnover = EXCLUDED.is_turnover,
          animation_data = EXCLUDED.animation_data,
          raw_data = EXCLUDED.raw_data
        RETURNING id;
      `;

      const values = [
        gameId,
        driveId,
        play.espn_play_id || null,
        sport,
        play.play_sequence,
        play.drive_play_sequence || null,
        play.period || 1,
        play.clock || null,
        play.start_yard || null,
        play.end_yard || null,
        play.yards_gained || null,
        play.down || null,
        play.distance || null,
        play.down_distance_text || null,
        play.possession_text || null,
        play.start_down_distance_text || null,
        play.start_possession_text || null,
        play.play_type || null,
        play.play_text || null,
        play.possession_team_abbr || null,
        play.possession_team_id || null,
        play.is_scoring || false,
        play.score_value || 0,
        play.away_score || 0,
        play.home_score || 0,
        play.is_touchdown || false,
        play.is_turnover || false,
        play.turnover_type || null,
        play.is_penalty || false,
        play.penalty_yards || null,
        play.animation_type || null,
        play.animation_data ? JSON.stringify(play.animation_data) : null,
        play.raw_data ? JSON.stringify(play.raw_data) : null
      ];

      await client.query(query, values);
      savedCount++;
    }

    return savedCount;
  } catch (error) {
    console.error('Error saving plays:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get drives for a game
 * @param {string} gameId - ESPN game ID
 * @returns {Array} - Array of drive objects ordered by sequence
 */
async function getGameDrives(gameId) {
  const client = await pool.connect();

  try {
    const query = `
      SELECT * FROM game_drives
      WHERE game_id = $1
      ORDER BY drive_sequence;
    `;

    const result = await client.query(query, [gameId]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching game drives:', error);
    return [];
  } finally {
    client.release();
  }
}

/**
 * Get plays for a game
 * @param {string} gameId - ESPN game ID
 * @param {Object} options - Optional filters { period, fromSequence, limit }
 * @returns {Array} - Array of play objects ordered by sequence
 */
async function getGamePlays(gameId, options = {}) {
  const client = await pool.connect();

  try {
    let query = `
      SELECT * FROM game_plays
      WHERE game_id = $1
    `;
    const values = [gameId];
    let paramIndex = 2;

    if (options.period) {
      query += ` AND period = $${paramIndex}`;
      values.push(options.period);
      paramIndex++;
    }

    if (options.fromSequence) {
      query += ` AND play_sequence >= $${paramIndex}`;
      values.push(options.fromSequence);
      paramIndex++;
    }

    query += ' ORDER BY play_sequence';

    if (options.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(options.limit);
    }

    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Error fetching game plays:', error);
    return [];
  } finally {
    client.release();
  }
}

/**
 * Get games that have play data saved
 * @param {Object} filters - { sport, dateFrom, dateTo, team, limit }
 * @returns {Array} - Array of game objects with play counts
 */
async function getGamesWithPlays(filters = {}) {
  const client = await pool.connect();

  try {
    let query = `
      SELECT g.*,
             g.play_count as saved_play_count,
             g.has_play_data
      FROM games g
      WHERE g.has_play_data = TRUE
    `;
    const values = [];
    let paramIndex = 1;

    if (filters.sport) {
      query += ` AND g.sport = $${paramIndex}`;
      values.push(filters.sport);
      paramIndex++;
    }

    if (filters.dateFrom) {
      query += ` AND g.game_date >= $${paramIndex}`;
      values.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      query += ` AND g.game_date <= $${paramIndex}`;
      values.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.team) {
      query += ` AND (g.home_team_id = $${paramIndex} OR g.away_team_id = $${paramIndex})`;
      values.push(filters.team);
      paramIndex++;
    }

    query += ' ORDER BY g.game_date DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(filters.limit);
    }

    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Error fetching games with plays:', error);
    return [];
  } finally {
    client.release();
  }
}

/**
 * Mark a game as having play data
 * @param {string} gameId - ESPN game ID
 * @param {number} playCount - Number of plays saved
 */
async function markGameHasPlays(gameId, playCount) {
  const client = await pool.connect();

  try {
    const query = `
      UPDATE games
      SET has_play_data = TRUE, play_count = $2, last_updated = NOW()
      WHERE id = $1;
    `;

    await client.query(query, [gameId, playCount]);
    return true;
  } catch (error) {
    console.error('Error marking game has plays:', error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Check if a game has complete play data
 * @param {string} gameId - ESPN game ID
 * @returns {boolean}
 */
async function hasCompletePlays(gameId) {
  const client = await pool.connect();

  try {
    const query = `
      SELECT has_play_data, play_count FROM games WHERE id = $1;
    `;

    const result = await client.query(query, [gameId]);
    if (result.rows.length === 0) return false;

    return result.rows[0].has_play_data === true;
  } catch (error) {
    console.error('Error checking game plays:', error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Get full game data for replay (game info + drives + plays)
 * @param {string} gameId - ESPN game ID
 * @returns {Object} - { game, drives, plays }
 */
async function getGameForReplay(gameId) {
  const client = await pool.connect();

  try {
    // Get game info
    const gameQuery = 'SELECT * FROM games WHERE id = $1';
    const gameResult = await client.query(gameQuery, [gameId]);

    if (gameResult.rows.length === 0) {
      return null;
    }

    const game = gameResult.rows[0];

    // Get drives
    const drivesQuery = 'SELECT * FROM game_drives WHERE game_id = $1 ORDER BY drive_sequence';
    const drivesResult = await client.query(drivesQuery, [gameId]);

    // Get plays
    const playsQuery = 'SELECT * FROM game_plays WHERE game_id = $1 ORDER BY play_sequence';
    const playsResult = await client.query(playsQuery, [gameId]);

    return {
      game,
      drives: drivesResult.rows,
      plays: playsResult.rows
    };
  } catch (error) {
    console.error('Error fetching game for replay:', error);
    return null;
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
  // Game Replay functions
  saveDrives,
  savePlays,
  getGameDrives,
  getGamePlays,
  getGamesWithPlays,
  markGameHasPlays,
  hasCompletePlays,
  getGameForReplay,
};
