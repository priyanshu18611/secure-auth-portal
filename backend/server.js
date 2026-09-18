// ============================================================
// PRIYANSHU SECURE PORTAL
// Production Authentication Backend
// Version 3.0.0
// ============================================================
//
// Features:
// - Express
// - PostgreSQL
// - bcrypt password hashing
// - JWT authentication
// - Helmet security headers
// - CORS protection
// - Rate limiting
// - Input validation
// - Password reset tokens
// - Resend password reset email
// - PostgreSQL activity logging
// - Excel security report
// - Health monitoring
// - Graceful shutdown
// ============================================================


// ============================================================
// IMPORTS
// ============================================================

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
const https = require("https");

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
    closeDatabase
} = require("./database");


// ============================================================
// APP
// ============================================================

const app = express();


// Render runs the application behind a reverse proxy.
app.set("trust proxy", 1);


// ============================================================
// ENVIRONMENT
// ============================================================

const PORT =
    Number(process.env.PORT) || 10000;

const NODE_ENV =
    process.env.NODE_ENV || "development";


// ============================================================
// JWT CONFIGURATION
// ============================================================

const JWT_SECRET =
    process.env.JWT_SECRET;

const JWT_EXPIRES_IN =
    process.env.JWT_EXPIRES_IN || "1h";

const JWT_ISSUER =
    "priyanshu-secure-portal";

const JWT_AUDIENCE =
    "secure-auth-portal";


// ============================================================
// EMAIL CONFIGURATION
// ============================================================

const RESEND_API_KEY =
    process.env.RESEND_API_KEY;

const RESEND_FROM_EMAIL =
    process.env.RESEND_FROM_EMAIL ||
    "onboarding@resend.dev";

const FRONTEND_URL =
    "https://priyanshu18611.github.io/secure-auth-portal";


// ============================================================
// SECURITY STARTUP VALIDATION
// ============================================================

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


// ============================================================
// HELMET
// ============================================================

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);


// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
    "https://priyanshu18611.github.io"
];

app.use(
    cors({
        origin: function (origin, callback) {

            // Allow non-browser requests such as
            // health checks and server-side clients.

            if (!origin) {
                return callback(null, true);
            }

            if (
                allowedOrigins.includes(origin)
            ) {
                return callback(null, true);
            }

            return callback(
                new Error(
                    "CORS origin not allowed."
                )
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


// ============================================================
// JSON BODY LIMIT
// ============================================================

app.use(
    express.json({
        limit: "10kb"
    })
);


// ============================================================
// GENERAL RATE LIMITER
// ============================================================

const generalLimiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        max: 300,

        standardHeaders: true,

        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many requests. Please try again later."
        }
    });

app.use(generalLimiter);


// ============================================================
// AUTH RATE LIMITER
// ============================================================

const authLimiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        max: 10,

        standardHeaders: true,

        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many authentication attempts. Please try again later."
        }
    });


// ============================================================
// INPUT HELPERS
// ============================================================

function normalizeEmail(email) {

    return String(email || "")
        .trim()
        .toLowerCase();

}


function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


function isValidPassword(password) {

    return (
        typeof password === "string" &&
        password.length >= 6 &&
        password.length <= 128
    );

}


function isValidName(name) {

    return (
        typeof name === "string" &&
        name.trim().length >= 2 &&
        name.trim().length <= 100
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


// ============================================================
// JWT
// ============================================================

function generateAccessToken(user) {

    return jwt.sign(
        {
            sub: String(user.id),
            email: user.email,
            name: user.name
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


// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

function authenticateToken(req, res, next) {

    const authHeader =
        req.headers.authorization;

    if (
        !authHeader ||
        !authHeader.startsWith("Bearer ")
    ) {

        return res.status(401).json({
            success: false,
            message:
                "Authentication required."
        });

    }

    const token =
        authHeader.substring(7).trim();

    if (!token) {

        return res.status(401).json({
            success: false,
            message:
                "Authentication token missing."
        });

    }

    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET,
                {
                    issuer: JWT_ISSUER,
                    audience: JWT_AUDIENCE,
                    algorithms: ["HS256"]
                }
            );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message:
                "Invalid or expired authentication token."
        });

    }

}


// ============================================================
// ACTIVITY LOG TABLE
// ============================================================

async function initializeActivityLogs() {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS activity_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            name TEXT,
            email TEXT,
            action TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMPTZ
                DEFAULT CURRENT_TIMESTAMP
        );
    `);


    // --------------------------------------------------------
    // Compatibility migrations
    // --------------------------------------------------------

    await pool.query(`
        ALTER TABLE activity_logs
        ADD COLUMN IF NOT EXISTS user_id INTEGER;
    `);

    await pool.query(`
        ALTER TABLE activity_logs
        ADD COLUMN IF NOT EXISTS name TEXT;
    `);

    await pool.query(`
        ALTER TABLE activity_logs
        ADD COLUMN IF NOT EXISTS email TEXT;
    `);

    await pool.query(`
        ALTER TABLE activity_logs
        ADD COLUMN IF NOT EXISTS action TEXT;
    `);

    await pool.query(`
        ALTER TABLE activity_logs
        ADD COLUMN IF NOT EXISTS ip_address TEXT;
    `);

    await pool.query(`
        ALTER TABLE activity_logs
        ADD COLUMN IF NOT EXISTS user_agent TEXT;
    `);

    await pool.query(`
        ALTER TABLE activity_logs
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP;
    `);


    // --------------------------------------------------------
    // Older database compatibility
    // --------------------------------------------------------

    await pool.query(`
        ALTER TABLE activity_logs
        ALTER COLUMN name DROP NOT NULL;
    `);


    await pool.query(`
        UPDATE activity_logs
        SET action = 'LEGACY_LOG'
        WHERE action IS NULL;
    `);


    await pool.query(`
        ALTER TABLE activity_logs
        ALTER COLUMN action SET NOT NULL;
    `);


    // --------------------------------------------------------
    // Indexes
    // --------------------------------------------------------

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        idx_activity_logs_user_id
        ON activity_logs(user_id);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        idx_activity_logs_created_at
        ON activity_logs(created_at);
    `);


    console.log(
        "PostgreSQL activity_logs table is ready."
    );

}


// ============================================================
// EXCEL ACTIVITY REPORT
// ============================================================

function logToExcel(data) {

    try {

        const dataDirectory =
            path.join(
                __dirname,
                "..",
                "data"
            );


        if (
            !fs.existsSync(dataDirectory)
        ) {

            fs.mkdirSync(
                dataDirectory,
                {
                    recursive: true
                }
            );

        }


        const filePath =
            path.join(
                dataDirectory,
                "activity_logs.xlsx"
            );


        let rows = [];


        if (
            fs.existsSync(filePath)
        ) {

            try {

                const workbook =
                    XLSX.readFile(
                        filePath
                    );

                const sheetName =
                    workbook.SheetNames[0];

                if (sheetName) {

                    rows =
                        XLSX.utils.sheet_to_json(
                            workbook.Sheets[
                                sheetName
                            ]
                        );

                }

            } catch (readError) {

                console.error(
                    "Excel read error:",
                    readError.message
                );

                rows = [];

            }

        }


        rows.push({

            Timestamp:
                new Date().toISOString(),

            User_ID:
                data.userId || "",

            Name:
                data.name || "",

            Email:
                data.email || "",

            Action:
                data.action || "",

            IP_Address:
                data.ip || "",

            User_Agent:
                data.userAgent || ""

        });


        const worksheet =
            XLSX.utils.json_to_sheet(
                rows
            );


        const workbook =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Activity Logs"
        );


        XLSX.writeFile(
            workbook,
            filePath
        );


    } catch (error) {

        // Excel reporting must never
        // break authentication.

        console.error(
            "Excel logging error:",
            error.message
        );

    }

}


// ============================================================
// ACTIVITY LOGGER
// ============================================================

async function logActivity(
    req,
    action,
    userId = null,
    email = null,
    name = null
) {

    const forwardedFor =
        req.headers["x-forwarded-for"];

    const ip =
        forwardedFor
            ? String(forwardedFor)
                .split(",")[0]
                .trim()
            : (
                req.socket.remoteAddress ||
                ""
            );


    const userAgent =
        req.headers["user-agent"] ||
        "";


    // --------------------------------------------------------
    // PostgreSQL logging
    // --------------------------------------------------------

    try {

        await pool.query(
            `
            INSERT INTO activity_logs
            (
                user_id,
                name,
                email,
                action,
                ip_address,
                user_agent
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6
            )
            `,
            [
                userId,
                name,
                email,
                action,
                ip,
                userAgent
            ]
        );

    } catch (error) {

        console.error(
            "Database activity logging error:",
            error.message
        );

    }


    // --------------------------------------------------------
    // Excel reporting
    // --------------------------------------------------------

    logToExcel({
        userId,
        name,
        email,
        action,
        ip,
        userAgent
    });

}


// ============================================================
// RESEND PASSWORD RESET EMAIL
// ============================================================

async function sendPasswordResetEmail(
    recipientEmail,
    recipientName,
    resetToken
) {

    if (!RESEND_API_KEY) {

        throw new Error(
            "RESEND_API_KEY is not configured."
        );

    }


    const resetUrl =
        `${FRONTEND_URL}/reset-password.html?token=${encodeURIComponent(
            resetToken
        )}`;


    // --------------------------------------------------------
    // Escape user-controlled name
    // --------------------------------------------------------

    const safeName =
        String(
            recipientName || "there"
        )
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");


    // --------------------------------------------------------
    // Email HTML
    // --------------------------------------------------------

    const emailHtml = `
<!DOCTYPE html>

<html>

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width,
                 initial-scale=1.0"
    >

    <title>
        Password Reset
    </title>

</head>

<body style="
    margin:0;
    padding:0;
    background:#080b12;
    font-family:Arial,
                 Helvetica,
                 sans-serif;
">

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        background:#080b12;
        padding:40px 15px;
    "
>

<tr>

<td align="center">

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        max-width:600px;
        background:#111722;
        border-radius:18px;
        overflow:hidden;
    "
>

<tr>

<td style="
    padding:40px;
    color:#ffffff;
">

<div style="
    font-size:30px;
    font-weight:800;
    letter-spacing:3px;
    margin-bottom:8px;
">
    PK
</div>

<div style="
    color:#8b95a7;
    font-size:11px;
    font-weight:700;
    letter-spacing:3px;
    margin-bottom:32px;
">
    PRIYANSHU SECURE PORTAL
</div>

<h1 style="
    margin:0 0 20px 0;
    font-size:28px;
    color:#ffffff;
">
    Reset Your Password
</h1>

<p style="
    color:#b7c0cf;
    font-size:15px;
    line-height:1.7;
">
    Hello ${safeName},
</p>

<p style="
    color:#b7c0cf;
    font-size:15px;
    line-height:1.7;
">
    We received a request to reset
    your Priyanshu Secure Portal
    password.
</p>

<div style="
    text-align:center;
    margin:35px 0;
">

<a
    href="${resetUrl}"
    style="
        display:inline-block;
        padding:15px 30px;
        background:#ffffff;
        color:#080b12;
        text-decoration:none;
        border-radius:10px;
        font-weight:700;
        font-size:15px;
    "
>
    Reset Password
</a>

</div>

<p style="
    color:#8f99aa;
    font-size:13px;
    line-height:1.7;
">
    This link expires in
    <strong>15 minutes</strong>
    and can only be used once.
</p>

<p style="
    color:#8f99aa;
    font-size:13px;
    line-height:1.7;
">
    If you did not request this
    password reset, you can safely
    ignore this email.
</p>

<hr style="
    border:0;
    border-top:1px solid #252d3a;
    margin:30px 0;
">

<p style="
    color:#697386;
    font-size:12px;
    line-height:1.6;
">
    Priyanshu Secure Portal<br>
    Automated Security Notification
</p>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>
`;


    // --------------------------------------------------------
    // Resend request
    // --------------------------------------------------------

    const requestBody =
        JSON.stringify({

            from:
                RESEND_FROM_EMAIL,

            to: [
                recipientEmail
            ],

            subject:
                "Reset Your Priyanshu Secure Portal Password",

            html:
                emailHtml

        });


    const responseData =
        await new Promise(
            (resolve, reject) => {

                const request =
                    https.request(
                        "https://api.resend.com/emails",
                        {
                            method: "POST",

                            headers: {
                                "Authorization":
                                    `Bearer ${RESEND_API_KEY}`,

                                "Content-Type":
                                    "application/json",

                                "Content-Length":
                                    Buffer.byteLength(
                                        requestBody
                                    )
                            },

                            timeout: 15000
                        },

                        (response) => {

                            let body = "";


                            response.setEncoding(
                                "utf8"
                            );


                            response.on(
                                "data",
                                (chunk) => {
                                    body += chunk;
                                }
                            );


                            response.on(
                                "end",
                                () => {

                                    let data;

                                    try {

                                        data =
                                            body
                                                ? JSON.parse(
                                                    body
                                                )
                                                : {};

                                    } catch (
                                        parseError
                                    ) {

                                        return reject(
                                            new Error(
                                                "Invalid response received from Resend."
                                            )
                                        );

                                    }


                                    resolve({
                                        statusCode:
                                            response.statusCode,

                                        data
                                    });

                                }
                            );

                        }
                    );


                request.on(
                    "timeout",
                    () => {

                        request.destroy(
                            new Error(
                                "Resend API request timed out."
                            )
                        );

                    }
                );


                request.on(
                    "error",
                    (error) => {

                        reject(error);

                    }
                );


                request.write(
                    requestBody
                );


                request.end();

            }
        );


    if (
        responseData.statusCode < 200 ||
        responseData.statusCode >= 300
    ) {

        console.error(
            "Resend API error:",
            responseData.statusCode,
            responseData.data
        );

        throw new Error(
            "Password reset email could not be sent."
        );

    }


    console.log(
        "Password reset email sent:",
        responseData.data.id
    );


    return responseData.data;

}


// ============================================================
// ROOT
// ============================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            service:
                "Priyanshu Secure Portal API",

            version:
                "3.0.0",

            status:
                "online",

            security: {

                helmet: true,

                cors: true,

                rateLimiting: true,

                bcrypt: true,

                jwt: true,

                postgresql: true,

                passwordRecovery: true,

                resendEmail:
                    Boolean(
                        RESEND_API_KEY
                    )
            }

        });

    }
);


// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
    "/api/health",
    async (req, res) => {

        try {

            await pool.query(
                "SELECT 1"
            );


            return res.json({

                success: true,

                api:
                    "online",

                database:
                    "connected"

            });

        } catch (error) {

            console.error(
                "Health check error:",
                error.message
            );


            return res.status(
                503
            ).json({

                success: false,

                api:
                    "online",

                database:
                    "disconnected"

            });

        }

    }
);


// ============================================================
// REGISTER
// ============================================================

app.post(
    "/api/register",
    authLimiter,
    async (req, res) => {

        try {

            const name =
                String(
                    req.body.name || ""
                ).trim();


            const email =
                normalizeEmail(
                    req.body.email
                );


            const password =
                req.body.password;


            // ------------------------------------------------
            // Validation
            // ------------------------------------------------

            if (
                !isValidName(name)
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Name must contain between 2 and 100 characters."

                });

            }


            if (
                !isValidEmail(email)
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Please provide a valid email address."

                });

            }


            if (
                !isValidPassword(password)
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Password must contain between 6 and 128 characters."

                });

            }


            // ------------------------------------------------
            // Existing user
            // ------------------------------------------------

            const existingUser =
                await findUserByEmail(
                    email
                );


            if (existingUser) {

                return res.status(
                    409
                ).json({

                    success: false,

                    message:
                        "An account with this email already exists."

                });

            }


            // ------------------------------------------------
            // Hash password
            // ------------------------------------------------

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            // ------------------------------------------------
            // Create user
            // ------------------------------------------------

            const user =
                await createUser(
                    name,
                    email,
                    passwordHash
                );


            // ------------------------------------------------
            // Activity log
            // ------------------------------------------------

            await logActivity(
                req,
                "REGISTER",
                user.id,
                user.email,
                user.name
            );


            return res.status(
                201
            ).json({

                success: true,

                message:
                    "Account created successfully.",

                user:
                    safeUser(user)

            });

        } catch (error) {

            console.error(
                "REGISTER ERROR:",
                error
            );


            if (
                error.code === "23505"
            ) {

                return res.status(
                    409
                ).json({

                    success: false,

                    message:
                        "An account with this email already exists."

                });

            }


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to create account."

            });

        }

    }
);


// ============================================================
// LOGIN
// ============================================================

app.post(
    "/api/login",
    authLimiter,
    async (req, res) => {

        try {

            const email =
                normalizeEmail(
                    req.body.email
                );


            const password =
                req.body.password;


            // ------------------------------------------------
            // Validation
            // ------------------------------------------------

            if (
                !isValidEmail(email)
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Please provide a valid email address."

                });

            }


            if (
                typeof password !== "string" ||
                password.length === 0
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Password is required."

                });

            }


            // ------------------------------------------------
            // Find user
            // ------------------------------------------------

            const user =
                await findUserByEmail(
                    email
                );


            if (!user) {

                await logActivity(
                    req,
                    "LOGIN_FAILED",
                    null,
                    email,
                    null
                );


                return res.status(
                    401
                ).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            // ------------------------------------------------
            // Verify password
            // ------------------------------------------------

            const passwordMatches =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );


            if (!passwordMatches) {

                await logActivity(
                    req,
                    "LOGIN_FAILED",
                    user.id,
                    user.email,
                    user.name
                );


                return res.status(
                    401
                ).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            // ------------------------------------------------
            // Generate JWT
            // ------------------------------------------------

            const token =
                generateAccessToken(
                    user
                );


            // ------------------------------------------------
            // Activity log
            // ------------------------------------------------

            await logActivity(
                req,
                "LOGIN_SUCCESS",
                user.id,
                user.email,
                user.name
            );


            return res.json({

                success: true,

                message:
                    "Login successful.",

                token,

                expiresIn:
                    JWT_EXPIRES_IN,

                user:
                    safeUser(user)

            });

        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to process login."

            });

        }

    }
);


// ============================================================
// FORGOT PASSWORD
// ============================================================

app.post(
    "/api/forgot-password",
    authLimiter,
    async (req, res) => {

        const email =
            normalizeEmail(
                req.body.email
            );


        // Generic response prevents
        // account enumeration.

        const genericResponse = {

            success: true,

            message:
                "If an account exists for this email, a password reset link has been sent."

        };


        try {

            if (
                !isValidEmail(email)
            ) {

                return res.status(
                    200
                ).json(
                    genericResponse
                );

            }


            const user =
                await findUserByEmail(
                    email
                );


            if (!user) {

                await logActivity(
                    req,
                    "PASSWORD_RESET_REQUEST_UNKNOWN",
                    null,
                    email,
                    null
                );


                return res.status(
                    200
                ).json(
                    genericResponse
                );

            }


            // ------------------------------------------------
            // Secure random token
            // ------------------------------------------------

            const resetToken =
                crypto
                    .randomBytes(32)
                    .toString("hex");


            const tokenHash =
                crypto
                    .createHash("sha256")
                    .update(resetToken)
                    .digest("hex");


            const expiresAt =
                new Date(
                    Date.now() +
                    15 * 60 * 1000
                );


            await createPasswordResetToken(
                user.id,
                tokenHash,
                expiresAt
            );


            // ------------------------------------------------
            // Send email
            // ------------------------------------------------

            try {

                await sendPasswordResetEmail(
                    user.email,
                    user.name,
                    resetToken
                );

            } catch (emailError) {

                console.error(
                    "PASSWORD RESET EMAIL ERROR:",
                    emailError.message
                );


                // Delete exact token
                // if email failed.

                try {

                    await pool.query(
                        `
                        DELETE FROM password_reset_tokens
                        WHERE token_hash = $1
                        `,
                        [tokenHash]
                    );

                } catch (deleteError) {

                    console.error(
                        "Reset token cleanup error:",
                        deleteError.message
                    );

                }


                await logActivity(
                    req,
                    "PASSWORD_RESET_EMAIL_FAILED",
                    user.id,
                    user.email,
                    user.name
                );


                return res.status(
                    200
                ).json(
                    genericResponse
                );

            }


            await logActivity(
                req,
                "PASSWORD_RESET_REQUESTED",
                user.id,
                user.email,
                user.name
            );


            return res.status(
                200
            ).json(
                genericResponse
            );

        } catch (error) {

            console.error(
                "FORGOT PASSWORD ERROR:",
                error
            );


            return res.status(
                200
            ).json(
                genericResponse
            );

        }

    }
);


// ============================================================
// RESET PASSWORD
// ============================================================

app.post(
    "/api/reset-password",
    authLimiter,
    async (req, res) => {

        try {

            const token =
                String(
                    req.body.token || ""
                ).trim();


            const newPassword =
                req.body.password;


            // ------------------------------------------------
            // Token validation
            // ------------------------------------------------

            if (
                !/^[a-f0-9]{64}$/i.test(token)
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Invalid or expired password reset link."

                });

            }


            // ------------------------------------------------
            // Password validation
            // ------------------------------------------------

            if (
                !isValidPassword(
                    newPassword
                )
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Password must contain between 6 and 128 characters."

                });

            }


            // ------------------------------------------------
            // Hash token
            // ------------------------------------------------

            const tokenHash =
                crypto
                    .createHash("sha256")
                    .update(token)
                    .digest("hex");


            // ------------------------------------------------
            // Find valid token
            // ------------------------------------------------

            const resetRecord =
                await findValidPasswordResetToken(
                    tokenHash
                );


            if (!resetRecord) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Invalid or expired password reset link."

                });

            }


            // ------------------------------------------------
            // Find user
            // ------------------------------------------------

            const user =
                await findUserById(
                    resetRecord.user_id
                );


            if (!user) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Invalid or expired password reset link."

                });

            }


            // ------------------------------------------------
            // Hash new password
            // ------------------------------------------------

            const passwordHash =
                await bcrypt.hash(
                    newPassword,
                    12
                );


            // ------------------------------------------------
            // Update password
            // ------------------------------------------------

            const updatedUser =
                await updateUserPassword(
                    user.id,
                    passwordHash
                );


            if (!updatedUser) {

                return res.status(
                    500
                ).json({

                    success: false,

                    message:
                        "Unable to update password."

                });

            }


            // ------------------------------------------------
            // Mark token used
            // ------------------------------------------------

            await markPasswordResetTokenUsed(
                resetRecord.id
            );


            // ------------------------------------------------
            // Delete other active tokens
            // ------------------------------------------------

            await pool.query(
                `
                DELETE FROM password_reset_tokens
                WHERE user_id = $1
                AND used_at IS NULL
                `,
                [user.id]
            );


            // ------------------------------------------------
            // Activity log
            // ------------------------------------------------

            await logActivity(
                req,
                "PASSWORD_RESET_SUCCESS",
                user.id,
                user.email,
                user.name
            );


            return res.status(
                200
            ).json({

                success: true,

                message:
                    "Password reset successfully. You can now log in with your new password."

            });

        } catch (error) {

            console.error(
                "RESET PASSWORD ERROR:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to reset password."

            });

        }

    }
);


// ============================================================
// CURRENT USER
// ============================================================

app.get(
    "/api/me",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                Number(
                    req.user.sub
                );


            if (
                !Number.isInteger(userId) ||
                userId <= 0
            ) {

                return res.status(
                    401
                ).json({

                    success: false,

                    message:
                        "Invalid authentication token."

                });

            }


            const user =
                await findUserById(
                    userId
                );


            if (!user) {

                return res.status(
                    404
                ).json({

                    success: false,

                    message:
                        "User account not found."

                });

            }


            return res.json({

                success: true,

                user:
                    safeUser(user)

            });

        } catch (error) {

            console.error(
                "ME ENDPOINT ERROR:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to load user profile."

            });

        }

    }
);


// ============================================================
// 404
// ============================================================

app.use(
    (req, res) => {

        res.status(
            404
        ).json({

            success: false,

            message:
                "API endpoint not found."

        });

    }
);


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "GLOBAL SERVER ERROR:",
            error
        );


        if (
            error &&
            error.message ===
                "CORS origin not allowed."
        ) {

            return res.status(
                403
            ).json({

                success: false,

                message:
                    "Origin not allowed."

            });

        }


        if (
            res.headersSent
        ) {

            return next(error);

        }


        return res.status(
            500
        ).json({

            success: false,

            message:
                "Internal server error."

        });

    }
);


// ============================================================
// SERVER STARTUP
// ============================================================

async function startServer() {

    try {

        console.log(
            "============================================================"
        );

        console.log(
            "PRIYANSHU SECURE PORTAL"
        );

        console.log(
            "Production Authentication Backend"
        );

        console.log(
            "Version: 3.0.0"
        );

        console.log(
            "============================================================"
        );


        // ----------------------------------------------------
        // PostgreSQL connection
        // ----------------------------------------------------

        console.log(
            "Connecting to PostgreSQL..."
        );


        await pool.query(
            "SELECT 1"
        );


        console.log(
            "PostgreSQL CONNECTED"
        );


        // ----------------------------------------------------
        // Database initialization
        // ----------------------------------------------------

        await initializeDatabase();


        console.log(
            "Database initialization completed."
        );


        // ----------------------------------------------------
        // Activity logs
        // ----------------------------------------------------

        await initializeActivityLogs();


        // ----------------------------------------------------
        // Reset-token cleanup
        // ----------------------------------------------------

        await deleteExpiredResetTokens();


        console.log(
            "Expired password reset tokens cleaned."
        );


        // ----------------------------------------------------
        // Security status
        // ----------------------------------------------------

        console.log(
            "JWT ACTIVE"
        );

        console.log(
            "bcrypt ACTIVE"
        );

        console.log(
            "Helmet ACTIVE"
        );

        console.log(
            "CORS ACTIVE"
        );

        console.log(
            "Rate Limiting ACTIVE"
        );

        console.log(
            "Password Recovery ACTIVE"
        );

        console.log(
            "Resend Email:",
            RESEND_API_KEY
                ? "CONFIGURED"
                : "NOT CONFIGURED"
        );


        // ----------------------------------------------------
        // Start HTTP server
        // ----------------------------------------------------

        const server =
            app.listen(
                PORT,
                () => {

                    console.log(
                        "============================================================"
                    );

                    console.log(
                        `SERVER LIVE ON PORT ${PORT}`
                    );

                    console.log(
                        `Environment: ${NODE_ENV}`
                    );

                    console.log(
                        `Frontend: ${FRONTEND_URL}`
                    );

                    console.log(
                        "API Status: ONLINE"
                    );

                    console.log(
                        "============================================================"
                    );

                }
            );


        // ----------------------------------------------------
        // Graceful shutdown
        // ----------------------------------------------------

        const shutdown =
            async (signal) => {

                console.log(
                    `Received ${signal}. Shutting down...`
                );


                server.close(
                    async () => {

                        console.log(
                            "HTTP server closed."
                        );


                        try {

                            await closeDatabase();


                            console.log(
                                "PostgreSQL connection pool closed."
                            );


                            process.exit(0);

                        } catch (error) {

                            console.error(
                                "Database shutdown error:",
                                error.message
                            );


                            process.exit(1);

                        }

                    }
                );

            };


        process.once(
            "SIGTERM",
            () => {
                shutdown("SIGTERM");
            }
        );


        process.once(
            "SIGINT",
            () => {
                shutdown("SIGINT");
            }
        );


    } catch (error) {

        console.error(
            "============================================================"
        );

        console.error(
            "SERVER STARTUP FAILED"
        );

        console.error(
            error
        );

        console.error(
            "============================================================"
        );


        try {

            await closeDatabase();

        } catch (shutdownError) {

            console.error(
                "Database cleanup error:",
                shutdownError.message
            );

        }


        process.exit(1);

    }

}


// ============================================================
// START APPLICATION
// ============================================================

startServer();
