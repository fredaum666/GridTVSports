// Manual Subscription Activation Script
// Run this ONCE to activate your test subscription

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gridtv',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function activateSubscription() {
  try {
    // Get your user (adjust email if needed)
    const userEmail = 'fred.pacheco@gmail.com'; // Change this to your email

    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [userEmail]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found with email:', userEmail);
      console.log('Available users:');
      const allUsers = await pool.query('SELECT id, email FROM users');
      allUsers.rows.forEach(u => console.log(`  - ${u.email}`));
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log('✅ Found user:', user.email, '(ID:', user.id + ')');

    // Update user to active subscription status
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    await pool.query(`
      UPDATE users
      SET subscription_status = 'active',
          subscription_plan = 'monthly',
          subscription_ends_at = $1
      WHERE id = $2
    `, [oneMonthLater, user.id]);

    console.log('✅ Subscription activated!');
    console.log('   Status: active');
    console.log('   Plan: monthly');
    console.log('   Ends at:', oneMonthLater.toISOString());

    // Create subscription record
    await pool.query(`
      INSERT INTO subscriptions (
        user_id,
        stripe_subscription_id,
        plan_type,
        status,
        current_period_start,
        current_period_end
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [
      user.id,
      'sub_manual_activation_' + Date.now(),
      'monthly',
      'active',
      now,
      oneMonthLater
    ]);

    console.log('✅ Subscription record created');
    console.log('\n🎉 Done! Refresh your /subscription page to see the update.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

activateSubscription();
