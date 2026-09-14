const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// ==========================================
// DATABASE LOCATION
// ==========================================

const dataDir = path.join(__dirname, "../data");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, {
        recursive: true
    });
}

const databasePath =
    path.join(dataDir, "users.db");


// ==========================================
// DATABASE CONNECTION
// ==========================================

const db = new Database(databasePath);


// ==========================================
// PERFORMANCE / SAFETY
// ==========================================

db.pragma("journal_mode = WAL");


// ==========================================
// USERS TABLE
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS users (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        email TEXT NOT NULL UNIQUE,

        password_hash TEXT NOT NULL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    );
`);


// ==========================================
// CREATE USER
// ==========================================

function createUser(
    name,
    email,
    passwordHash
) {

    const statement = db.prepare(`
        INSERT INTO users
        (
            name,
            email,
            password_hash
        )
        VALUES
        (
            ?,
            ?,
            ?
        )
    `);

    return statement.run(
        name,
        email,
        passwordHash
    );
}


// ==========================================
// FIND USER BY EMAIL
// ==========================================

function findUserByEmail(email) {

    const statement = db.prepare(`
        SELECT
            id,
            name,
            email,
            password_hash,
            created_at
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
    `);

    return statement.get(email);
}


// ==========================================
// EXPORT
// ==========================================

module.exports = {

    db,

    createUser,

    findUserByEmail

};
