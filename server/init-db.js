const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
    console.log('--- Database Initialization ---');

    const connectionConfig = process.env.MYSQL_URL || {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        multipleStatements: true
    };

    const connection = await mysql.createConnection(connectionConfig);
    // Enable multiple statements if it's a connection string
    if (typeof connectionConfig === 'string') {
        connection.config.multipleStatements = true;
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
