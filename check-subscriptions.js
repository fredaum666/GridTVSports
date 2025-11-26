require('dotenv').config();
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
    const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.subscription_status,
        u.subscription_plan,
        s.stripe_subscription_id,
        s.status,
        s.cancel_at_period_end,
        s.current_period_end
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.subscription_status = 'active'
      ORDER BY s.created_at DESC
    `);

    console.log('Active Subscriptions:');
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
