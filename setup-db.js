// Setup script to initialize the database
const db = require('./db');

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
      console.log('\n💡 Next steps:');
      console.log('   1. Run: node server.js');
      console.log('   2. Games will automatically save to database when completed');
      console.log('   3. Completed games will load from database (no API calls needed)');
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
