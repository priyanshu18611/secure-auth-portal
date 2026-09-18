const { Pool } = require("pg");


/* ============================================================
   DATABASE CONFIG
============================================================ */

if (!process.env.DATABASE_URL) {

  throw new Error(
    "DATABASE_URL environment variable is not configured."
  );
}


const pool =
  new Pool({

    connectionString:
      process.env.DATABASE_URL,

    ssl: {
      rejectUnauthorized: false
    },

    max: 10,

    idleTimeoutMillis:
      30000,

    connectionTimeoutMillis:
      10000
  });


/* ============================================================
   INITIALIZE DATABASE
============================================================ */

async function initializeDatabase() {

  const client =
    await pool.connect();


  try {

    /* USERS */

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (

        id SERIAL PRIMARY KEY,

        name TEXT NOT NULL,

        email TEXT NOT NULL UNIQUE,

        password_hash TEXT NOT NULL,

        created_at
          TIMESTAMPTZ
          DEFAULT CURRENT_TIMESTAMP
      );
    `);


    /* PASSWORD RESET */

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (

        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        token_hash TEXT NOT NULL UNIQUE,

        expires_at TIMESTAMPTZ NOT NULL,

        used_at TIMESTAMPTZ,

        created_at
          TIMESTAMPTZ
          DEFAULT CURRENT_TIMESTAMP
      );
    `);


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


    /* LEARNING PROGRESS */

    await client.query(`
      CREATE TABLE IF NOT EXISTS learning_progress (

        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        course_key TEXT NOT NULL,

        state JSONB NOT NULL
          DEFAULT '{}'::jsonb,

        updated_at
          TIMESTAMPTZ
          DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(user_id, course_key)
      );
    `);


    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_learning_progress_user_id

      ON learning_progress(user_id);
    `);


    /* CERTIFICATES */

    await client.query(`
      CREATE TABLE IF NOT EXISTS certificates (

        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        course_key TEXT NOT NULL,

        certificate_id TEXT NOT NULL UNIQUE,

        issued_at
          TIMESTAMPTZ
          DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(user_id, course_key)
      );
    `);


    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_certificates_certificate_id

      ON certificates(certificate_id);
    `);


  } finally {

    client.release();
  }
}


/* ============================================================
   USER
============================================================ */

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

      WHERE LOWER(email)
        = LOWER($1)

      LIMIT 1
      `,

      [email]
    );


  return result.rows[0];
}


async function findUserById(
  userId
) {

  const result =
    await pool.query(

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


/* ============================================================
   PASSWORD RESET
============================================================ */

async function createPasswordResetToken(
  userId,
  tokenHash,
  expiresAt
) {

  await pool.query(

    `
    DELETE FROM password_reset_tokens

    WHERE user_id = $1

    AND used_at IS NULL
    `,

    [userId]
  );


  const result =
    await pool.query(

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


async function findValidPasswordResetToken(
  tokenHash
) {

  const result =
    await pool.query(

      `
      SELECT
        id,
        user_id,
        expires_at,
        used_at

      FROM password_reset_tokens

      WHERE token_hash = $1

      AND used_at IS NULL

      AND expires_at >
        CURRENT_TIMESTAMP

      LIMIT 1
      `,

      [tokenHash]
    );


  return result.rows[0];
}


async function markPasswordResetTokenUsed(
  tokenId
) {

  await pool.query(

    `
    UPDATE password_reset_tokens

    SET used_at =
      CURRENT_TIMESTAMP

    WHERE id = $1
    `,

    [tokenId]
  );
}


async function updateUserPassword(
  userId,
  passwordHash
) {

  const result =
    await pool.query(

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


async function deleteExpiredResetTokens() {

  await pool.query(

    `
    DELETE FROM password_reset_tokens

    WHERE expires_at <=
      CURRENT_TIMESTAMP

    OR used_at IS NOT NULL
    `
  );
}


/* ============================================================
   LEARNING PROGRESS
============================================================ */

async function getLearningProgress(
  userId,
  courseKey
) {

  const result =
    await pool.query(

      `
      SELECT
        course_key,
        state,
        updated_at

      FROM learning_progress

      WHERE user_id = $1

      AND course_key = $2

      LIMIT 1
      `,

      [
        userId,
        courseKey
      ]
    );


  return (
    result.rows[0] ||
    null
  );
}


async function upsertLearningProgress(
  userId,
  courseKey,
  state
) {

  const result =
    await pool.query(

      `
      INSERT INTO learning_progress
      (
        user_id,
        course_key,
        state,
        updated_at
      )

      VALUES
      (
        $1,
        $2,
        $3::jsonb,
        CURRENT_TIMESTAMP
      )

      ON CONFLICT
      (
        user_id,
        course_key
      )

      DO UPDATE SET

        state =
          EXCLUDED.state,

        updated_at =
          CURRENT_TIMESTAMP

      RETURNING
        course_key,
        state,
        updated_at
      `,

      [
        userId,
        courseKey,
        JSON.stringify(
          state || {}
        )
      ]
    );


  return result.rows[0];
}


/* ============================================================
   CERTIFICATES
============================================================ */

async function getCertificateByCourse(
  userId,
  courseKey
) {

  const result =
    await pool.query(

      `
      SELECT
        certificate_id,
        course_key,
        issued_at

      FROM certificates

      WHERE user_id = $1

      AND course_key = $2

      LIMIT 1
      `,

      [
        userId,
        courseKey
      ]
    );


  return (
    result.rows[0] ||
    null
  );
}


async function createCertificate(
  userId,
  courseKey,
  certificateId
) {

  const result =
    await pool.query(

      `
      INSERT INTO certificates
      (
        user_id,
        course_key,
        certificate_id
      )

      VALUES
      (
        $1,
        $2,
        $3
      )

      ON CONFLICT
      (
        user_id,
        course_key
      )

      DO UPDATE SET

        certificate_id =
          certificates.certificate_id

      RETURNING
        certificate_id,
        course_key,
        issued_at
      `,

      [
        userId,
        courseKey,
        certificateId
      ]
    );


  return result.rows[0];
}


async function findCertificate(
  certificateId
) {

  const result =
    await pool.query(

      `
      SELECT

        c.certificate_id,

        c.course_key,

        c.issued_at,

        u.name

      FROM certificates c

      JOIN users u
        ON u.id = c.user_id

      WHERE c.certificate_id = $1

      LIMIT 1
      `,

      [certificateId]
    );


  return (
    result.rows[0] ||
    null
  );
}


/* ============================================================
   CLOSE DATABASE
============================================================ */

async function closeDatabase() {

  await pool.end();
}


/* ============================================================
   EXPORTS
============================================================ */

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

  getLearningProgress,

  upsertLearningProgress,

  getCertificateByCourse,

  createCertificate,

  findCertificate,

  closeDatabase
};
