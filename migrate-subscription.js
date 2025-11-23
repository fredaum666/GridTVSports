// Migration script to add subscription columns to existing database
const { Pool } = require('pg');
require('dotenv').config();

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log('🚀 Starting subscription migration...\n');

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database\n');

    // Add subscription columns to users table
    console.log('📝 Adding subscription columns to users table...');

    const alterQueries = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)',
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial'",
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP'
    ];

    for (const query of alterQueries) {
      await pool.query(query);
      console.log('  ✓ ' + query.split('ADD COLUMN IF NOT EXISTS ')[1]?.split(' ')[0]);
    }

    // Create subscriptions table
    console.log('\n📝 Creating subscriptions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        stripe_subscription_id VARCHAR(255) UNIQUE,
        stripe_price_id VARCHAR(255),
        plan_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        canceled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✓ subscriptions table created');

    // Create indexes for subscriptions
    console.log('\n📝 Creating indexes for subscriptions...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)');
    console.log('  ✓ indexes created');

    // Create payment_history table
    console.log('\n📝 Creating payment_history table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_history (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        stripe_payment_id VARCHAR(255),
        stripe_invoice_id VARCHAR(255),
        amount INT NOT NULL,
        currency VARCHAR(10) DEFAULT 'usd',
        status VARCHAR(50) NOT NULL,
        description VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✓ payment_history table created');

    // Create index for payment_history
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_user ON payment_history(user_id)');
    console.log('  ✓ payment_history index created');

    // Create subscription_plans table
    console.log('\n📝 Creating subscription_plans table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        stripe_price_id VARCHAR(255) UNIQUE NOT NULL,
        plan_type VARCHAR(50) NOT NULL,
        price INT NOT NULL,
        currency VARCHAR(10) DEFAULT 'usd',
        features JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✓ subscription_plans table created');

    // Set default trial period for existing users who don't have one
    console.log('\n📝 Setting trial period for existing users...');
    const result = await pool.query(`
      UPDATE users
      SET trial_ends_at = NOW() + INTERVAL '10 days',
          subscription_status = 'trial'
      WHERE trial_ends_at IS NULL
      RETURNING id
    `);
    console.log(`  ✓ Updated ${result.rowCount} users with trial period`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Added 5 subscription columns to users table');
    console.log('   - Created subscriptions table');
    console.log('   - Created payment_history table');
    console.log('   - Created subscription_plans table');
    console.log('   - Set 10-day trial for existing users');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
    console.log('\n👋 Database connection closed.');
  }
}

migrate();
