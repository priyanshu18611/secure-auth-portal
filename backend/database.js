// ============================================================
// PRIYANSHU SECURE PORTAL
// PostgreSQL Database Layer
// Version 3.0.0
// ============================================================

const { Pool } = require("pg");

// ============================================================
// DATABASE CONFIGURATION
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
// DATABASE ERROR HANDLER
// ============================================================

pool.on("error", (error) => {
    console.error(
        "Unexpected PostgreSQL pool error:",
        error.message
    );
});

// ============================================================
// INITIALIZE DATABASE
// ============================================================

async function initializeDatabase() {
    const client = await pool.connect();

    try {
        // ----------------------------------------------------
        // USERS TABLE
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // PASSWORD RESET TOKENS
        // ----------------------------------------------------

        await client.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,

                user_id INTEGER NOT NULL
                    REFERENCES users(id)
                    ON DELETE CASCADE,

                token_hash TEXT NOT NULL UNIQUE,

                expires_at TIMESTAMPTZ NOT NULL,

                used_at TIMESTAMPTZ,

                created_at TIMESTAMPTZ
                    DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ----------------------------------------------------
        // INDEXES
        // ----------------------------------------------------

        await client.query(`
            CREATE INDEX IF NOT EXISTS
            idx_password_reset_tokens_user_id
            ON password_reset_tokens(user_id);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS
            idx_password_reset_tokens_expires_at
            ON password_reset_tokens(expires_at);
        `);

        console.log(
            "PostgreSQL database tables are ready."
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
    const result = await pool.query(
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
    const result = await pool.query(
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
        [email]
    );

    return result.rows[0];
}

// ============================================================
// FIND USER BY ID
// ============================================================

async function findUserById(
    userId
) {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            email,
            created_at
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
    );

    return result.rows[0];
}

// ============================================================
// CREATE PASSWORD RESET TOKEN
// ============================================================

async function createPasswordResetToken(
    userId,
    tokenHash,
    expiresAt
) {
    // Remove previous unused reset tokens
    // belonging to this user.

    await pool.query(
        `
        DELETE FROM password_reset_tokens
        WHERE user_id = $1
        AND used_at IS NULL
        `,
        [userId]
    );

    const result = await pool.query(
        `
        INSERT INTO password_reset_tokens
        (
            user_id,
            token_hash,
            expires_at
        )
        VALUES
        (
            $1,
            $2,
            $3
        )
        RETURNING
            id,
            user_id,
            expires_at,
            created_at
        `,
        [
            userId,
            tokenHash,
            expiresAt
        ]
    );

    return result.rows[0];
}

// ============================================================
// FIND VALID PASSWORD RESET TOKEN
// ============================================================

async function findValidPasswordResetToken(
    tokenHash
) {
    const result = await pool.query(
        `
        SELECT
            id,
            user_id,
            expires_at,
            used_at
        FROM password_reset_tokens
        WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
        LIMIT 1
        `,
        [tokenHash]
    );

    return result.rows[0];
}

// ============================================================
// MARK RESET TOKEN AS USED
// ============================================================

async function markPasswordResetTokenUsed(
    tokenId
) {
    await pool.query(
        `
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE id = $1
        AND used_at IS NULL
        `,
        [tokenId]
    );
}

// ============================================================
// UPDATE USER PASSWORD
// ============================================================

async function updateUserPassword(
    userId,
    passwordHash
) {
    const result = await pool.query(
        `
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
        RETURNING
            id,
            name,
            email,
            created_at
        `,
        [
            passwordHash,
            userId
        ]
    );

    return result.rows[0];
}

// ============================================================
// DELETE EXPIRED / USED RESET TOKENS
// ============================================================

async function deleteExpiredResetTokens() {
    await pool.query(
        `
        DELETE FROM password_reset_tokens
        WHERE expires_at <= CURRENT_TIMESTAMP
        OR used_at IS NOT NULL
        `
    );
}

// ============================================================
// CLOSE DATABASE
// ============================================================

async function closeDatabase() {
    await pool.end();
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    pool,

    initializeDatabase,

    createUser,

    findUserByEmail,

    findUserById,

    createPasswordResetToken,

    findValidPasswordResetToken,

    markPasswordResetTokenUsed,

    updateUserPassword,

    deleteExpiredResetTokens,

    closeDatabase
};
