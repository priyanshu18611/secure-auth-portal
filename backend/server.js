const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const {
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
} = require("./database");


/* ============================================================
   APP CONFIG
============================================================ */

const app = express();

const PORT = process.env.PORT || 10000;

const JWT_SECRET = process.env.JWT_SECRET;

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN || "1h";

const JWT_ISSUER =
  "priyanshu-secure-portal";

const JWT_AUDIENCE =
  "secure-auth-portal";

const RESEND_API_KEY =
  process.env.RESEND_API_KEY;

const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  "onboarding@resend.dev";

const FRONTEND_URL =
  "https://priyanshu18611.github.io/secure-auth-portal";


/* ============================================================
   SECURITY
============================================================ */

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is missing."
  );
}

if (JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET must contain at least 32 characters."
  );
}

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);


/* ============================================================
   CORS
============================================================ */

const allowedOrigins = [
  "https://priyanshu18611.github.io"
];

app.use(
  cors({
    origin: function (origin, callback) {

      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS origin not allowed.")
      );
    },

    methods: [
      "GET",
      "POST",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ],

    credentials: false
  })
);


/* ============================================================
   BODY
============================================================ */

app.use(
  express.json({
    limit: "10kb"
  })
);


/* ============================================================
   RATE LIMIT
============================================================ */

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Too many requests. Please try again later."
    }
  })
);


const authLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Too many authentication attempts. Please try again later."
    }
  });


/* ============================================================
   VALIDATION
============================================================ */

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}


function validPassword(value) {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    value.length <= 128
  );
}


function validName(value) {
  return (
    typeof value === "string" &&
    value.trim().length >= 2 &&
    value.trim().length <= 80
  );
}


function safeUser(user) {

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at
  };
}


/* ============================================================
   JWT
============================================================ */

function signToken(user) {

  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email
    },

    JWT_SECRET,

    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithm: "HS256"
    }
  );
}


/* ============================================================
   AUTH MIDDLEWARE
============================================================ */

function authenticateToken(req, res, next) {

  const header =
    req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {

    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  try {

    const token =
      header.slice(7);

    const payload =
      jwt.verify(
        token,
        JWT_SECRET,
        {
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
          algorithms: ["HS256"]
        }
      );

    req.userId =
      Number(payload.sub);

    if (
      !Number.isInteger(req.userId) ||
      req.userId <= 0
    ) {
      throw new Error(
        "Invalid user ID"
      );
    }

    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired session."
    });
  }
}


/* ============================================================
   COURSE VALIDATION
============================================================ */

function validCourseKey(value) {

  return /^[a-z0-9-]{1,60}$/.test(
    String(value || "")
  );
}


function cleanState(state) {

  if (
    !state ||
    typeof state !== "object" ||
    Array.isArray(state)
  ) {
    return {};
  }

  const json =
    JSON.stringify(state);

  if (json.length > 200000) {
    throw new Error(
      "Learning state is too large."
    );
  }

  return state;
}


/* ============================================================
   ACTIVITY LOG TABLE
============================================================ */

async function initializeActivityLogs() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,

      user_id INTEGER
        REFERENCES users(id)
        ON DELETE SET NULL,

      action TEXT NOT NULL,

      email TEXT,

      ip TEXT,

      user_agent TEXT,

      metadata JSONB
        DEFAULT '{}'::jsonb,

      created_at TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP
    )
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS
    idx_activity_logs_user_id
    ON activity_logs(user_id)
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS
    idx_activity_logs_created_at
    ON activity_logs(created_at)
  `);
}


/* ============================================================
   EXCEL ACTIVITY LOG
============================================================ */

const excelPath =
  path.join(
    __dirname,
    "..",
    "data",
    "activity_logs.xlsx"
  );


function logToExcel(row) {

  try {

    fs.mkdirSync(
      path.dirname(excelPath),
      {
        recursive: true
      }
    );

    let rows = [];

    if (
      fs.existsSync(excelPath)
    ) {

      const workbook =
        XLSX.readFile(
          excelPath
        );

      const sheet =
        workbook.Sheets[
          "Activity Logs"
        ];

      if (sheet) {

        rows =
          XLSX.utils.sheet_to_json(
            sheet
          );
      }
    }


    rows.push(row);


    const workbook =
      XLSX.utils.book_new();


    const worksheet =
      XLSX.utils.json_to_sheet(
        rows
      );


    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Activity Logs"
    );


    XLSX.writeFile(
      workbook,
      excelPath
    );

  } catch (error) {

    console.error(
      "Excel log error:",
      error.message
    );
  }
}


/* ============================================================
   ACTIVITY LOGGER
============================================================ */

async function logActivity(
  req,
  action,
  userId,
  email,
  metadata = {}
) {

  try {

    await pool.query(
      `
      INSERT INTO activity_logs
      (
        user_id,
        action,
        email,
        ip,
        user_agent,
        metadata
      )

      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6::jsonb
      )
      `,

      [
        userId || null,
        action,
        email || null,
        req.ip || null,
        req.get("user-agent") || null,
        JSON.stringify(metadata)
      ]
    );

  } catch (error) {

    console.error(
      "DB activity log error:",
      error.message
    );
  }


  logToExcel({
    timestamp:
      new Date().toISOString(),

    user_id:
      userId || "",

    action,

    email:
      email || "",

    ip:
      req.ip || "",

    metadata:
      JSON.stringify(metadata)
  });
}


/* ============================================================
   RESEND EMAIL
============================================================ */

function sendResendEmail(
  to,
  subject,
  html
) {

  if (!RESEND_API_KEY) {
    return Promise.resolve(false);
  }


  return new Promise(
    (resolve) => {

      const https =
        require("https");


      const body =
        JSON.stringify({

          from:
            RESEND_FROM_EMAIL,

          to: [
            to
          ],

          subject,

          html
        });


      const request =
        https.request(

          {
            hostname:
              "api.resend.com",

            path:
              "/emails",

            method:
              "POST",

            headers: {

              Authorization:
                `Bearer ${RESEND_API_KEY}`,

              "Content-Type":
                "application/json",

              "Content-Length":
                Buffer.byteLength(body)
            }
          },

          response => {

            let data = "";

            response.on(
              "data",
              chunk => {
                data += chunk;
              }
            );


            response.on(
              "end",
              () => {

                if (
                  response.statusCode >= 200 &&
                  response.statusCode < 300
                ) {

                  resolve(true);

                } else {

                  console.error(
                    "Resend error:",
                    data
                  );

                  resolve(false);
                }
              }
            );
          }
        );


      request.on(
        "error",
        error => {

          console.error(
            "Resend request error:",
            error.message
          );

          resolve(false);
        }
      );


      request.write(body);

      request.end();
    }
  );
}


/* ============================================================
   ROOT
============================================================ */

app.get(
  "/",
  (req, res) => {

    res.json({

      success: true,

      name:
        "Priyanshu Secure Auth API",

      version:
        "3.1.0"
    });
  }
);


/* ============================================================
   HEALTH
============================================================ */

app.get(
  "/api/health",
  async (req, res) => {

    try {

      await pool.query(
        "SELECT 1"
      );

      res.json({

        success: true,

        api:
          "online",

        database:
          "connected"
      });

    } catch (error) {

      res.status(503).json({

        success: false,

        api:
          "online",

        database:
          "disconnected"
      });
    }
  }
);


/* ============================================================
   REGISTER
============================================================ */

app.post(
  "/api/register",
  authLimiter,
  async (req, res) => {

    try {

      const name =
        String(
          req.body?.name || ""
        ).trim();


      const email =
        normalizeEmail(
          req.body?.email
        );


      const password =
        req.body?.password;


      if (!validName(name)) {

        return res.status(400).json({

          success: false,

          message:
            "Name must be 2-80 characters."
        });
      }


      if (!validEmail(email)) {

        return res.status(400).json({

          success: false,

          message:
            "Enter a valid email address."
        });
      }


      if (!validPassword(password)) {

        return res.status(400).json({

          success: false,

          message:
            "Password must be 8-128 characters."
        });
      }


      const existing =
        await findUserByEmail(
          email
        );


      if (existing) {

        return res.status(409).json({

          success: false,

          message:
            "An account with this email already exists."
        });
      }


      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );


      const user =
        await createUser(
          name,
          email,
          passwordHash
        );


      await logActivity(
        req,
        "REGISTER",
        user.id,
        user.email
      );


      res.status(201).json({

        success: true,

        message:
          "Registration successful.",

        user:
          safeUser(user)
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Registration failed."
      });
    }
  }
);


/* ============================================================
   LOGIN
============================================================ */

app.post(
  "/api/login",
  authLimiter,
  async (req, res) => {

    try {

      const email =
        normalizeEmail(
          req.body?.email
        );


      const password =
        req.body?.password;


      if (
        !validEmail(email) ||
        typeof password !== "string"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid email or password."
        });
      }


      const user =
        await findUserByEmail(
          email
        );


      if (
        !user ||
        !(await bcrypt.compare(
          password,
          user.password_hash
        ))
      ) {

        await logActivity(
          req,
          "LOGIN_FAILED",
          user?.id,
          null,
          {
            email
          }
        );


        return res.status(401).json({

          success: false,

          message:
            "Invalid email or password."
        });
      }


      const token =
        signToken(user);


      await logActivity(
        req,
        "LOGIN",
        user.id,
        user.email
      );


      res.json({

        success: true,

        message:
          "Login successful.",

        token,

        user:
          safeUser(user)
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Login failed."
      });
    }
  }
);


/* ============================================================
   FORGOT PASSWORD
============================================================ */

app.post(
  "/api/forgot-password",
  authLimiter,
  async (req, res) => {

    const email =
      normalizeEmail(
        req.body?.email
      );


    const genericResponse = {

      success: true,

      message:
        "If an account exists, a password reset link has been sent."
    };


    try {

      if (!validEmail(email)) {
        return res.json(
          genericResponse
        );
      }


      const user =
        await findUserByEmail(
          email
        );


      if (!user) {
        return res.json(
          genericResponse
        );
      }


      const rawToken =
        crypto
          .randomBytes(32)
          .toString("hex");


      const tokenHash =
        crypto
          .createHash("sha256")
          .update(rawToken)
          .digest("hex");


      const expiresAt =
        new Date(
          Date.now() +
          30 * 60 * 1000
        );


      await createPasswordResetToken(
        user.id,
        tokenHash,
        expiresAt
      );


      const resetLink =
        `${FRONTEND_URL}/reset-password.html?token=${encodeURIComponent(rawToken)}`;


      const safeName =
        String(user.name)
          .replace(/[<>]/g, "");


      const emailSent =
        await sendResendEmail(

          user.email,

          "Reset your Priyanshu Secure Portal password",

          `
          <div style="font-family:Arial,sans-serif">
            <h2>Priyanshu Secure Portal</h2>

            <p>Hello ${safeName},</p>

            <p>
              You requested a password reset.
            </p>

            <p>
              This link expires in 30 minutes.
            </p>

            <p>
              <a
                href="${resetLink}"
                style="
                  display:inline-block;
                  padding:12px 20px;
                  background:#6d28d9;
                  color:white;
                  text-decoration:none;
                  border-radius:8px;
                "
              >
                Reset Password
              </a>
            </p>

            <p>
              If you did not request this,
              you can ignore this email.
            </p>
          </div>
          `
        );


      await logActivity(
        req,
        "PASSWORD_RESET_REQUEST",
        user.id,
        user.email,
        {
          email_sent:
            emailSent
        }
      );


      res.json(
        genericResponse
      );


    } catch (error) {

      console.error(error);

      res.json(
        genericResponse
      );
    }
  }
);


/* ============================================================
   RESET PASSWORD
============================================================ */

app.post(
  "/api/reset-password",
  authLimiter,
  async (req, res) => {

    try {

      const token =
        String(
          req.body?.token || ""
        );


      const password =
        req.body?.password;


      if (
        !token ||
        !validPassword(password)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid token or password."
        });
      }


      const tokenHash =
        crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");


      const resetRecord =
        await findValidPasswordResetToken(
          tokenHash
        );


      if (!resetRecord) {

        return res.status(400).json({

          success: false,

          message:
            "Reset link is invalid or expired."
        });
      }


      const user =
        await findUserById(
          resetRecord.user_id
        );


      if (!user) {

        return res.status(400).json({

          success: false,

          message:
            "Account not found."
        });
      }


      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );


      await updateUserPassword(
        user.id,
        passwordHash
      );


      await markPasswordResetTokenUsed(
        resetRecord.id
      );


      await logActivity(
        req,
        "PASSWORD_RESET_COMPLETED",
        user.id,
        user.email
      );


      res.json({

        success: true,

        message:
          "Password reset successful."
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Password reset failed."
      });
    }
  }
);


/* ============================================================
   CURRENT USER
============================================================ */

app.get(
  "/api/me",
  authenticateToken,
  async (req, res) => {

    try {

      const user =
        await findUserById(
          req.userId
        );


      if (!user) {

        return res.status(401).json({

          success: false,

          message:
            "User not found."
        });
      }


      res.json({

        success: true,

        user:
          safeUser(user)
      });


    } catch (error) {

      res.status(500).json({

        success: false,

        message:
          "Could not load profile."
      });
    }
  }
);


/* ============================================================
   GET LEARNING PROGRESS
============================================================ */

app.get(
  "/api/learning/:courseKey",
  authenticateToken,
  async (req, res) => {

    try {

      const courseKey =
        String(
          req.params.courseKey || ""
        ).toLowerCase();


      if (!validCourseKey(courseKey)) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid course key."
        });
      }


      const progress =
        await getLearningProgress(
          req.userId,
          courseKey
        );


      res.json({

        success: true,

        courseKey,

        state:
          progress?.state || {},

        updatedAt:
          progress?.updated_at || null
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Could not load learning progress."
      });
    }
  }
);


/* ============================================================
   SAVE LEARNING PROGRESS
============================================================ */

app.post(
  "/api/learning/:courseKey",
  authenticateToken,
  async (req, res) => {

    try {

      const courseKey =
        String(
          req.params.courseKey || ""
        ).toLowerCase();


      if (!validCourseKey(courseKey)) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid course key."
        });
      }


      const state =
        cleanState(
          req.body?.state
        );


      const saved =
        await upsertLearningProgress(
          req.userId,
          courseKey,
          state
        );


      res.json({

        success: true,

        message:
          "Learning progress saved.",

        courseKey:
          saved.course_key,

        state:
          saved.state,

        updatedAt:
          saved.updated_at
      });


    } catch (error) {

      console.error(error);

      res.status(400).json({

        success: false,

        message:
          error.message ||
          "Could not save learning progress."
      });
    }
  }
);


/* ============================================================
   ISSUE CERTIFICATE
============================================================ */

app.post(
  "/api/certificates",
  authenticateToken,
  async (req, res) => {

    try {

      const courseKey =
        String(
          req.body?.courseKey || ""
        ).toLowerCase();


      if (!validCourseKey(courseKey)) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid course key."
        });
      }


      const progress =
        await getLearningProgress(
          req.userId,
          courseKey
        );


      const state =
        progress?.state || {};


      const completedModules =
        Array.isArray(
          state.completedModules
        )
          ? state.completedModules.length
          : 0;


      const totalModules =
        Number(
          state.totalModules || 0
        );


      const progressPercent =
        Number(
          state.progress || 0
        );


      const eligible =
        state.certificateEligible === true ||
        (
          totalModules > 0 &&
          completedModules >= totalModules &&
          progressPercent >= 100
        );


      if (!eligible) {

        return res.status(403).json({

          success: false,

          message:
            "Complete the required course work before generating the certificate."
        });
      }


      const existing =
        await getCertificateByCourse(
          req.userId,
          courseKey
        );


      if (existing) {

        return res.json({

          success: true,

          certificate:
            existing
        });
      }


      const certificateId =
        `PK-${courseKey.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;


      const certificate =
        await createCertificate(
          req.userId,
          courseKey,
          certificateId
        );


      await logActivity(
        req,
        "CERTIFICATE_ISSUED",
        req.userId,
        null,
        {
          courseKey,
          certificateId:
            certificate.certificate_id
        }
      );


      res.status(201).json({

        success: true,

        certificate
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Could not issue certificate."
      });
    }
  }
);


/* ============================================================
   CERTIFICATE VERIFICATION
============================================================ */

app.get(
  "/api/certificates/verify/:certificateId",
  async (req, res) => {

    try {

      const certificateId =
        String(
          req.params.certificateId || ""
        )
        .trim()
        .toUpperCase();


      if (!certificateId) {

        return res.status(400).json({

          success: false,

          valid: false,

          message:
            "Certificate ID is required."
        });
      }


      const certificate =
        await findCertificate(
          certificateId
        );


      if (!certificate) {

        return res.status(404).json({

          success: true,

          valid: false,

          message:
            "Certificate not found."
        });
      }


      res.json({

        success: true,

        valid: true,

        certificate
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        valid: false,

        message:
          "Verification failed."
      });
    }
  }
);


/* ============================================================
   404
============================================================ */

app.use(
  (req, res) => {

    res.status(404).json({

      success: false,

      message:
        "Endpoint not found."
    });
  }
);


/* ============================================================
   GLOBAL ERROR
============================================================ */

app.use(
  (error, req, res, next) => {

    console.error(error);

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({

      success: false,

      message:
        "Internal server error."
    });
  }
);


/* ============================================================
   START SERVER
============================================================ */

async function startServer() {

  await initializeDatabase();

  await initializeActivityLogs();

  await deleteExpiredResetTokens()
    .catch(() => {});


  app.listen(
    PORT,
    () => {

      console.log(
        `Priyanshu Secure Auth API running on port ${PORT}`
      );
    }
  );
}


startServer()
  .catch(
    error => {

      console.error(
        "Startup failed:",
        error
      );

      process.exit(1);
    }
  );


/* ============================================================
   SHUTDOWN
============================================================ */

process.on(
  "SIGTERM",
  async () => {

    await closeDatabase();

    process.exit(0);
  }
);


process.on(
  "SIGINT",
  async () => {

    await closeDatabase();

    process.exit(0);
  }
);
