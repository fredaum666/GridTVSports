-- Migration: Add FCM (Firebase Cloud Messaging) support to push_subscriptions table
-- Run this script to add FCM columns to existing database

-- Add new columns for FCM support
ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(20) DEFAULT 'web';

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS device_info JSONB;

-- Make endpoint nullable (FCM subscriptions don't have web push endpoints)
ALTER TABLE push_subscriptions
ALTER COLUMN endpoint DROP NOT NULL;

-- Make p256dh_key nullable (FCM subscriptions don't need this)
ALTER TABLE push_subscriptions
ALTER COLUMN p256dh_key DROP NOT NULL;

-- Make auth_key nullable (FCM subscriptions don't need this)
ALTER TABLE push_subscriptions
ALTER COLUMN auth_key DROP NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_fcm_token ON push_subscriptions(fcm_token);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_type ON push_subscriptions(subscription_type);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_device ON push_subscriptions(device_id);

-- Add unique constraint for FCM tokens (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_fcm_token_key'
    ) THEN
        ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_fcm_token_key UNIQUE (fcm_token);
    END IF;
EXCEPTION WHEN others THEN
    -- Constraint might already exist or there might be duplicate values
    RAISE NOTICE 'Could not add FCM token unique constraint: %', SQLERRM;
END
$$;

-- Update existing rows to have subscription_type = 'web'
UPDATE push_subscriptions
SET subscription_type = 'web'
WHERE subscription_type IS NULL;

-- Add comments
COMMENT ON COLUMN push_subscriptions.subscription_type IS 'Type of subscription: web (Web Push API) or fcm (Firebase Cloud Messaging)';
COMMENT ON COLUMN push_subscriptions.fcm_token IS 'Firebase Cloud Messaging token (FCM only)';
COMMENT ON COLUMN push_subscriptions.device_id IS 'Unique device identifier';
COMMENT ON COLUMN push_subscriptions.device_info IS 'Device metadata JSON (model, manufacturer, sdk version, etc.)';

-- Done!
SELECT 'FCM support migration completed successfully!' as status;
