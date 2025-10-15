require('dotenv').config();
const { Pool } = require('pg');

// Azure PostgreSQL connection with SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Azure
  },
  connectionTimeoutMillis: 5000
});

async function testConnection() {
  console.log('\n🔄 Testing Azure PostgreSQL Connection...\n');
  
  // Show connection details (hide password)
  if (process.env.DATABASE_URL) {
    const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
    console.log('📝 Connection String:', maskedUrl);
  } else {
    console.error('❌ DATABASE_URL not found in .env file!');
    console.log('\n💡 Create a .env file with:');
    console.log('DATABASE_URL=postgresql://username@servername:password@servername.postgres.database.azure.com:5432/dbname?sslmode=require\n');
    process.exit(1);
  }
  
  try {
    // Test connection
    console.log('🔌 Connecting to Azure PostgreSQL...\n');
    const client = await pool.connect();
    
    // Get server info
    const result = await client.query(`
      SELECT 
        NOW() as current_time,
        version() as version,
        current_database() as database,
        current_user as user
    `);
    
    console.log('✅ CONNECTION SUCCESSFUL!\n');
    console.log('═══════════════════════════════════════');
    console.log('📅 Server Time:', result.rows[0].current_time);
    console.log('💾 Database:', result.rows[0].database);
    console.log('👤 User:', result.rows[0].user);
    console.log('🔧 Version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));
    console.log('═══════════════════════════════════════\n');
    
    // Test table creation
    console.log('🔨 Testing table creation...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id SERIAL PRIMARY KEY,
        test_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table creation successful!\n');
    
    // Test insert
    console.log('📝 Testing insert...');
    await client.query(`
      INSERT INTO connection_test (test_message) 
      VALUES ('Connection test successful at ' || NOW())
    `);
    console.log('✅ Insert successful!\n');
    
    // Test select
    console.log('📖 Testing select...');
    const testResult = await client.query(`
      SELECT * FROM connection_test 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    console.log('✅ Select successful!');
    console.log('   Last record:', testResult.rows[0].test_message);
    console.log('');
    
    // Clean up
    await client.query('DROP TABLE IF EXISTS connection_test');
    console.log('🧹 Cleanup complete!\n');
    
    client.release();
    await pool.end();
    
    console.log('🎉 All tests passed! Your Azure PostgreSQL connection is working perfectly!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ CONNECTION FAILED!\n');
    console.error('═══════════════════════════════════════');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Code:', error.code || 'N/A');
    console.error('Error Message:', error.message);
    console.error('═══════════════════════════════════════\n');
    
    // Provide specific troubleshooting tips
    console.log('💡 TROUBLESHOOTING TIPS:\n');
    
    if (error.code === 'ENOTFOUND') {
      console.log('❌ Server Not Found');
      console.log('   → Check your server name in DATABASE_URL');
      console.log('   → Format: servername.postgres.database.azure.com');
      console.log('   → Go to Azure Portal → PostgreSQL → Overview to verify\n');
      
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('❌ Connection Timeout / Refused');
      console.log('   → Azure firewall is blocking your connection!');
      console.log('   → Go to Azure Portal → PostgreSQL → Networking');
      console.log('   → Add firewall rule with your IP address');
      console.log('   → Or temporarily allow all: 0.0.0.0 to 255.255.255.255');
      console.log('   → Enable "Allow access to Azure services"\n');
      
    } else if (error.message.includes('password authentication failed')) {
      console.log('❌ Authentication Failed');
      console.log('   → Check username format: username@servername (not just username)');
      console.log('   → Verify password is correct');
      console.log('   → Example: gridtvadmin@gridtvsports:password123\n');
      
    } else if (error.message.includes('SSL') || error.message.includes('ssl')) {
      console.log('❌ SSL Error');
      console.log('   → Add ?sslmode=require to end of connection string');
      console.log('   → Azure requires SSL connections\n');
      
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('❌ Database Does Not Exist');
      console.log('   → Create database in Azure Portal');
      console.log('   → Or use default "postgres" database');
      console.log('   → Update DATABASE_URL with correct database name\n');
      
    } else {
      console.log('❌ Unknown Error');
      console.log('   → Check AZURE_POSTGRESQL_SETUP.md for detailed guide');
      console.log('   → Verify all connection parameters');
      console.log('   → Check Azure Portal for server status\n');
    }
    
    console.log('📖 See AZURE_POSTGRESQL_SETUP.md for complete troubleshooting guide\n');
    
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n\n👋 Connection test cancelled\n');
  await pool.end();
  process.exit(0);
});

testConnection();
