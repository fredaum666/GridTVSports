// Script to create Google Play review test account
// Run with: node create-google-review-account.js

require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('./db');

const EMAIL = 'googlereview@gridtvsports.com';
const PASSWORD = 'GooglePlay2024!';

async function createReviewAccount() {
    const client = await pool.connect();

    try {
        // Check if user already exists
        const existing = await client.query(
            'SELECT id, email FROM users WHERE email = $1',
            [EMAIL]
        );

        if (existing.rows.length > 0) {
            console.log('✅ Review account already exists:');
            console.log('   Email:', EMAIL);
            console.log('   User ID:', existing.rows[0].id);
            return;
        }

        // Create password hash
        const passwordHash = await bcrypt.hash(PASSWORD, 10);

        // Insert new user
        const result = await client.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
            [EMAIL, passwordHash]
        );

        console.log('✅ Created Google Play review account:');
        console.log('   Email:', EMAIL);
        console.log('   Password:', PASSWORD);
        console.log('   User ID:', result.rows[0].id);
        console.log('');
        console.log('Use these credentials in Google Play Console:');
        console.log('   Instruction name: Instructions for accessing GridTV Sports TV app');
        console.log('   Username:', EMAIL);
        console.log('   Password:', PASSWORD);

    } catch (error) {
        console.error('❌ Error creating account:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

createReviewAccount();
