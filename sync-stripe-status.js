require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gridtv',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

(async () => {
  try {
    console.log('🔄 Fetching all active subscriptions from database...');

    // Get all active subscriptions from database
    const result = await pool.query(`
      SELECT s.id, s.stripe_subscription_id, s.user_id, s.cancel_at_period_end, u.email
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active'
    `);

    console.log(`📊 Found ${result.rows.length} active subscriptions in database\n`);

    for (const sub of result.rows) {
      console.log(`\n🔍 Checking subscription: ${sub.stripe_subscription_id}`);
      console.log(`   User: ${sub.email}`);
      console.log(`   Current DB cancel_at_period_end: ${sub.cancel_at_period_end}`);

      // Fetch from Stripe
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        console.log(`   Stripe cancel_at_period_end: ${stripeSub.cancel_at_period_end}`);

        if (sub.cancel_at_period_end !== stripeSub.cancel_at_period_end) {
          console.log(`   ⚠️  MISMATCH! Updating database...`);

          await pool.query(
            `UPDATE subscriptions SET cancel_at_period_end = $1 WHERE id = $2`,
            [stripeSub.cancel_at_period_end, sub.id]
          );

          console.log(`   ✅ Updated successfully!`);
        } else {
          console.log(`   ✓ Already in sync`);
        }
      } catch (error) {
        console.error(`   ❌ Error fetching from Stripe:`, error.message);
      }
    }

    console.log('\n✅ Sync complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
