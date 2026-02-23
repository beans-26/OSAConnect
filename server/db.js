const mysql = require('mysql2');
require('dotenv').config();

const isURL = !!process.env.MYSQL_URL;
const dbConfig = process.env.MYSQL_URL || {
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASS || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

if (isURL) {
    console.log('🔗 Connecting to Database via MYSQL_URL');
} else {
    console.log('🔗 Database Config:', {
        host: dbConfig.host,
        user: dbConfig.user,
        database: dbConfig.database,
        port: dbConfig.port
    });
}

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
