const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'imbt.db');

console.log('🗄️ Initializing ImBT Database...');

// Remove existing database file if it exists
if (fs.existsSync(dbPath)) {
    console.log('🗑️ Removing existing database file...');
    fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

// Create tables
const createTables = () => {
    return new Promise((resolve, reject) => {
        let completedTables = 0;
        const totalTables = 5;

        const checkCompletion = () => {
            completedTables++;
            if (completedTables === totalTables) {
                resolve();
            }
        };

        // Users table
        db.run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                balance DECIMAL(10,2) DEFAULT 1000.00,
                total_bets INTEGER DEFAULT 0,
                total_wins INTEGER DEFAULT 0,
                total_losses INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('❌ Error creating users table:', err);
                reject(err);
                return;
            }
            console.log('✅ Users table created');
            checkCompletion();
        });

        // Bets table
        db.run(`
            CREATE TABLE bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                bet_type TEXT NOT NULL,
                outcome TEXT,
                result DECIMAL(10,2),
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('❌ Error creating bets table:', err);
                reject(err);
                return;
            }
            console.log('✅ Bets table created');
            checkCompletion();
        });

        // Friends table
        db.run(`
            CREATE TABLE friends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                friend_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (friend_id) REFERENCES users (id),
                UNIQUE(user_id, friend_id)
            )
        `, (err) => {
            if (err) {
                console.error('❌ Error creating friends table:', err);
                reject(err);
                return;
            }
            console.log('✅ Friends table created');
            checkCompletion();
        });

        // Transactions table
        db.run(`
            CREATE TABLE transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('❌ Error creating transactions table:', err);
                reject(err);
                return;
            }
            console.log('✅ Transactions table created');
            checkCompletion();
        });

        // Game sessions table
        db.run(`
            CREATE TABLE game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                game_type TEXT NOT NULL,
                score INTEGER DEFAULT 0,
                duration INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('❌ Error creating game_sessions table:', err);
                reject(err);
                return;
            }
            console.log('✅ Game sessions table created');
            checkCompletion();
        });
    });
};

// Insert sample data
const insertSampleData = () => {
    return new Promise((resolve, reject) => {
        const bcrypt = require('bcryptjs');
        const sampleUsers = [
            ['demo_user', 'demo@imbt.com', bcrypt.hashSync('password123', 10)],
            ['test_user', 'test@imbt.com', bcrypt.hashSync('password123', 10)],
            ['admin', 'admin@imbt.com', bcrypt.hashSync('admin123', 10)]
        ];

        let insertedUsers = 0;
        const totalUsers = sampleUsers.length;

        const checkUserCompletion = () => {
            insertedUsers++;
            if (insertedUsers === totalUsers) {
                console.log('✅ Sample users inserted');
                resolve();
            }
        };

        sampleUsers.forEach(user => {
            db.run(`
                INSERT INTO users (username, email, password_hash, balance)
                VALUES (?, ?, ?, 1000.00)
            `, user, (err) => {
                if (err) {
                    console.error('❌ Error inserting sample user:', err);
                    reject(err);
                    return;
                }
                checkUserCompletion();
            });
        });
    });
};

// Initialize database
const initDatabase = async () => {
    try {
        console.log('📋 Creating database tables...');
        await createTables();
        console.log('📝 Inserting sample data...');
        await insertSampleData();
        console.log('🎉 Database initialization completed successfully!');
        console.log('📊 Database file created at:', dbPath);
    } catch (error) {
        console.error('💥 Database initialization failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }
};

initDatabase();
