-- GridTV Sports Database Schema
-- PostgreSQL Database Schema for storing game data

-- Create games table for all sports
CREATE TABLE IF NOT EXISTS games (
  id VARCHAR(50) PRIMARY KEY,
  sport VARCHAR(10) NOT NULL,
  game_date DATE NOT NULL,
  week_number INT,
  season INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  home_team VARCHAR(100) NOT NULL,
  home_team_id VARCHAR(50),
  home_score INT DEFAULT 0,
  away_team VARCHAR(100) NOT NULL,
  away_team_id VARCHAR(50),
  away_score INT DEFAULT 0,
  raw_data JSONB,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_sport_date ON games(sport, game_date);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_season ON games(season);
CREATE INDEX IF NOT EXISTS idx_games_updated ON games(last_updated);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(50) PRIMARY KEY,
  sport VARCHAR(10) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  short_name VARCHAR(50),
  abbreviation VARCHAR(10),
  logo_url VARCHAR(500),
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on teams
CREATE INDEX IF NOT EXISTS idx_teams_sport ON teams(sport);

-- Create game_stats table for detailed statistics
CREATE TABLE IF NOT EXISTS game_stats (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(50) REFERENCES games(id) ON DELETE CASCADE,
  team_id VARCHAR(50),
  stat_type VARCHAR(50) NOT NULL,
  stat_value JSONB,
  period INT,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create indexes for game_stats
CREATE INDEX IF NOT EXISTS idx_stats_game ON game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_stats_team ON game_stats(team_id);

-- Sample query to get completed games
-- SELECT * FROM games WHERE status = 'completed' AND sport = 'NFL' ORDER BY game_date DESC LIMIT 10;

-- Sample query to get today's games
-- SELECT * FROM games WHERE game_date = CURRENT_DATE AND sport = 'NBA';

-- Sample query to get games by week (NFL)
-- SELECT * FROM games WHERE sport = 'NFL' AND week_number = 1 AND season = 2025;

-- Sample query to get all games for a team
-- SELECT * FROM games WHERE home_team_id = 'LAL' OR away_team_id = 'LAL' ORDER BY game_date DESC;

COMMENT ON TABLE games IS 'Stores all game data for NFL, NBA, MLB, NHL';
COMMENT ON TABLE teams IS 'Stores team information and logo URLs';
COMMENT ON TABLE game_stats IS 'Stores detailed game statistics';

COMMENT ON COLUMN games.raw_data IS 'Full ESPN API response in JSON format for historical reference';
COMMENT ON COLUMN games.status IS 'Game status: scheduled, live, completed';
COMMENT ON COLUMN games.week_number IS 'NFL week number (NULL for other sports)';
