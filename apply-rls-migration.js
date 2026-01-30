#!/usr/bin/env node

/**
 * Apply RLS Security Migration
 * Reads and executes the fix_rls_security.sql migration
 */

const fs = require('fs');
const { pool } = require('./db.js');

async function applyMigration() {
  console.log('🔧 Starting RLS Security Migration...\n');

  const client = await pool.connect();

  try {
    // Read the migration file (v2 - corrected for custom auth)
    const migrationSQL = fs.readFileSync('./supabase/migrations/fix_rls_security_v2.sql', 'utf8');

    console.log('📄 Migration file loaded');
    console.log(`📊 SQL length: ${migrationSQL.length} characters\n`);

    // Execute the migration
    console.log('⚡ Executing migration...');
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully!\n');

    // Verify RLS is enabled
    console.log('🔍 Verifying RLS is enabled on all tables...');
    const rlsCheck = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log('\n📋 RLS Status by Table:');
    console.log('─'.repeat(50));

    let allEnabled = true;
    rlsCheck.rows.forEach(row => {
      const status = row.rowsecurity ? '✅' : '❌';
      console.log(`${status} ${row.tablename.padEnd(35)} ${row.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
      if (!row.rowsecurity) allEnabled = false;
    });

    console.log('─'.repeat(50));

    // Count policies created
    console.log('\n🔐 Checking RLS policies...');
    const policyCount = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_policies
      WHERE schemaname = 'public';
    `);

    console.log(`✅ ${policyCount.rows[0].count} RLS policies created\n`);

    // Show some sample policies
    const samplePolicies = await client.query(`
      SELECT tablename, policyname, cmd
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
      LIMIT 10;
    `);

    console.log('📑 Sample Policies Created:');
    console.log('─'.repeat(80));
    samplePolicies.rows.forEach(row => {
      console.log(`  ${row.tablename} → ${row.policyname} [${row.cmd}]`);
    });
    console.log('─'.repeat(80));

    // Summary
    console.log('\n' + '═'.repeat(80));
    if (allEnabled) {
      console.log('🎉 SUCCESS! All tables now have Row Level Security enabled.');
      console.log('🔒 Your database is now secured against unauthorized API access.');
    } else {
      console.log('⚠️  WARNING: Some tables still have RLS disabled.');
      console.log('   Please review the output above and investigate.');
    }
    console.log('═'.repeat(80));

    console.log('\n✅ Next Steps:');
    console.log('   1. Verify Supabase Dashboard Linter shows 0 errors');
    console.log('   2. Test your backend APIs to ensure they still work');
    console.log('   3. Monitor application logs for any issues\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);

    if (error.message.includes('already exists')) {
      console.log('\n💡 This error might mean the migration was already partially applied.');
      console.log('   Check the Supabase Dashboard to verify RLS status.');
    }

    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
applyMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
