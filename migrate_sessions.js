const db = require('./server/db');

async function migrate() {
    try {
        console.log('Migrating database...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS service_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(20) NOT NULL,
                violation_id INT NOT NULL,
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP NULL,
                is_active BOOLEAN DEFAULT TRUE,
                total_minutes INT DEFAULT 0,
                FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ service_sessions table created or already exists.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
