-- Activate subscription for the test user
-- Run this with: psql -U postgres -d gridtv -f activate.sql

-- Update user subscription status
UPDATE users
SET subscription_status = 'active',
    subscription_plan = 'monthly',
    subscription_ends_at = NOW() + INTERVAL '1 month'
WHERE email = 'fred.pacheco@gmail.com';

-- Show the result
SELECT id, email, subscription_status, subscription_plan, subscription_ends_at
FROM users
WHERE email = 'fred.pacheco@gmail.com';
