-- Migration: Add ESPN text fields to game_plays table
-- These store ESPN's pre-formatted down/distance and possession text directly
-- instead of recalculating them (which was causing bugs)

ALTER TABLE game_plays ADD COLUMN IF NOT EXISTS down_distance_text VARCHAR(100);
ALTER TABLE game_plays ADD COLUMN IF NOT EXISTS possession_text VARCHAR(50);

COMMENT ON COLUMN game_plays.down_distance_text IS 'ESPN pre-formatted text like "1st & 10 at HOU 26"';
COMMENT ON COLUMN game_plays.possession_text IS 'ESPN pre-formatted text like "HOU 26"';
