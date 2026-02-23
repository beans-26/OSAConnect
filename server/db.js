const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = process.env.MYSQL_URL || {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'osaconnect_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Final Database Connectivity Check
pool.getConnection((err, conn) => {
    if (err) console.error('❌ DATABASE CONNECTION FAILED:', err.message);
    else {
        console.log('✅ DATABASE CONNECTED SUCCESSFULLY');
        conn.release();
    }
});

module.exports = pool.promise();
