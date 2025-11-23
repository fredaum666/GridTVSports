// Setup script to initialize the database
const db = require('./db');
const bcrypt = require('bcrypt');
const readline = require('readline');

async function createAdminUser() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\nCreate admin user? (y/n): ', async (answer) => {
      if (answer.toLowerCase() !== 'y') {
        rl.close();
        resolve(false);
        return;
      }

      rl.question('Admin email: ', async (email) => {
        rl.question('Admin password: ', async (password) => {
          rl.question('Display name (optional): ', async (displayName) => {
            rl.close();

            if (!email || !password) {
              console.log('❌ Email and password are required');
              resolve(false);
              return;
            }

            if (password.length < 8) {
              console.log('❌ Password must be at least 8 characters');
              resolve(false);
              return;
            }

            try {
              // Check if user already exists
              const existing = await db.pool.query(
                'SELECT id FROM users WHERE email = $1',
                [email.toLowerCase()]
              );

              if (existing.rows.length > 0) {
                console.log('⚠️ User already exists with this email');
                resolve(false);
                return;
              }

              // Hash password
              const passwordHash = await bcrypt.hash(password, 12);

              // Create admin user
              await db.pool.query(
                `INSERT INTO users (email, password_hash, display_name, role)
                 VALUES ($1, $2, $3, 'admin')`,
                [email.toLowerCase(), passwordHash, displayName || email.split('@')[0]]
              );

              console.log(`✅ Admin user created: ${email}`);
              resolve(true);
            } catch (error) {
              console.error('❌ Error creating admin user:', error.message);
              resolve(false);
            }
          });
        });
      });
    });
  });
}

async function setup() {
  console.log('🚀 Starting database setup...\n');

  try {
    // Initialize tables
    const success = await db.initializeDatabase();

    if (success) {
      console.log('\n✅ Database setup completed successfully!');
      console.log('\n📊 Tables created:');
      console.log('   - games (stores all game data)');
      console.log('   - teams (stores team information)');
      console.log('   - game_stats (stores detailed statistics)');
      console.log('   - users (stores user authentication data)');
      console.log('   - session (stores user sessions)');

      // Offer to create admin user
      await createAdminUser();

      console.log('\n💡 Next steps:');
      console.log('   1. Run: npm start');
      console.log('   2. Open http://localhost:3001/login.html');
      console.log('   3. Login with your admin credentials');
    } else {
      console.log('\n❌ Database setup failed. Please check the error messages above.');
    }
  } catch (error) {
    console.error('\n❌ Setup error:', error.message);
  } finally {
    // Close the database connection
    await db.pool.end();
    console.log('\n👋 Database connection closed.');
    process.exit(0);
  }
}

// Run setup
setup();
