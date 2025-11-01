-- Vows Site Database Schema
-- PostgreSQL Database Schema for storing wedding vows (SEPARATE from GridTVSports DB)

-- Create vows table with bilingual support
CREATE TABLE IF NOT EXISTS vows (
  id SERIAL PRIMARY KEY,
  person_type VARCHAR(20) NOT NULL CHECK (person_type IN ('groom', 'bride')),
  person_name_en VARCHAR(100),
  person_name_pt VARCHAR(100),
  vow_text_en TEXT NOT NULL,
  vow_text_pt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vows_person_type ON vows(person_type);
CREATE INDEX IF NOT EXISTS idx_vows_active ON vows(is_active);

-- Create unlock_status table to track vows visibility
CREATE TABLE IF NOT EXISTS unlock_status (
  id SERIAL PRIMARY KEY,
  is_unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMP,
  locked_at TIMESTAMP,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Insert default unlock status
INSERT INTO unlock_status (id, is_unlocked)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- Create admin_settings table for configuration
CREATE TABLE IF NOT EXISTS admin_settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value TEXT,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Insert default admin password
INSERT INTO admin_settings (setting_key, setting_value)
VALUES ('admin_password', '2025')
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE vows IS 'Stores wedding vows in English and Portuguese';
COMMENT ON TABLE unlock_status IS 'Tracks whether vows are visible to guests';
COMMENT ON TABLE admin_settings IS 'Stores admin configuration like password';
COMMENT ON COLUMN vows.person_type IS 'Type of person: groom or bride';
COMMENT ON COLUMN vows.vow_text_en IS 'Vow text in English';
COMMENT ON COLUMN vows.vow_text_pt IS 'Vow text in Portuguese';
