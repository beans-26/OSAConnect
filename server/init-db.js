const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
    console.log('--- 🛡️ OSA Connect Database Initialization ---');

    let connection;
    try {
        if (process.env.MYSQL_URL) {
            console.log('Connecting via MYSQL_URL...');
            // Railway fix: Ensure multipleStatements is allowed in the connection
            let url = process.env.MYSQL_URL;
            url += (url.includes('?') ? '&' : '?') + 'multipleStatements=true';
            connection = await mysql.createConnection(url);
        } else {
            console.log('Connecting via individual variables...');
            connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASS,
                multipleStatements: true
            });
        }
    } catch (err) {
        console.error('❌ Could not connect to database for init:', err.message);
        process.exit(1);
    }

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
