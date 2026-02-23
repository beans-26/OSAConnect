const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    console.log('Attempting connection with:');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('Password:', process.env.DB_PASS ? '********' : 'NONE');
    console.log('Database:', process.env.DB_NAME);

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        console.log('SUCCESS: Connected to database.');
        await connection.end();
    } catch (err) {
        console.error('ERROR:', err.code, err.message);
    }
}

test();
