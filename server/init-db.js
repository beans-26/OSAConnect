const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
    console.log('--- Database Initialization ---');

    // Connect without database initially
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        multipleStatements: true // Essential for running setup.sql
    });

    try {
        console.log('Reading setup.sql...');
        const sqlPath = path.join(__dirname, '..', 'setup.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running setup.sql script...');
        await connection.query(sql);

        console.log('✅ Database and Tables created successfully!');
    } catch (err) {
        console.error('❌ Failed to initialize database:', err.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

initializeDatabase();
