// ============================================================
// PRIYANSHU SECURE PORTAL
// PostgreSQL Database Layer
// ============================================================

const { Pool } = require("pg");


// ============================================================
// DATABASE CONNECTION
// ============================================================

if (!process.env.DATABASE_URL) {
    throw new Error(
        "DATABASE_URL environment variable is not configured."
    );
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    },

    max: 10,

    idleTimeoutMillis: 30000,

    connectionTimeoutMillis: 10000
});


// ============================================================
// INITIALIZE DATABASE
// ============================================================

async function initializeDatabase() {

    const client =
        await pool.connect();

    try {

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (

                id SERIAL PRIMARY KEY,

                name TEXT NOT NULL,

                email TEXT NOT NULL UNIQUE,

                password_hash TEXT NOT NULL,

                created_at TIMESTAMPTZ
                    DEFAULT CURRENT_TIMESTAMP

            );
        `);

        console.log(
            "✅ PostgreSQL users table is ready."
        );

    } finally {

        client.release();
    }
}


// ============================================================
// CREATE USER
// ============================================================

async function createUser(
    name,
    email,
    passwordHash
) {

    const result =
        await pool.query(
            `
            INSERT INTO users
            (
                name,
                email,
                password_hash
            )
            VALUES
            (
                $1,
                $2,
                $3
            )
            RETURNING
                id,
                name,
                email,
                created_at
            `,
            [
                name,
                email,
                passwordHash
            ]
        );

    return result.rows[0];
}


// ============================================================
// FIND USER BY EMAIL
// ============================================================

async function findUserByEmail(
    email
) {

    const result =
        await pool.query(
            `
            SELECT
                id,
                name,
                email,
                password_hash,
                created_at
            FROM users
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
            `,
            [
                email
            ]
        );

    return result.rows[0];
}


// ============================================================
// CLOSE DATABASE
// ============================================================

async function closeDatabase() {

    await pool.end();

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    pool,

    initializeDatabase,

    createUser,

    findUserByEmail,

    closeDatabase

};
