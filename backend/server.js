// ============================================================
// PRIYANSHU SECURE PORTAL
// Production Authentication Backend
// Version 2.8.1
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
// - Activity logging
// - Excel security report
// ============================================================


// ============================================================
// IMPORTS
// ============================================================

const express = require("express");

const cors = require("cors");

const helmet = require("helmet");

const rateLimit =
    require("express-rate-limit");

const bcrypt =
    require("bcryptjs");

const jwt =
    require("jsonwebtoken");

const crypto =
    require("crypto");

const XLSX =
    require("xlsx");

const fs =
    require("fs");

const path =
    require("path");

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

const app =
    express();

// Render runs the service behind a reverse proxy.
app.set("trust proxy", 1);


// ============================================================
// ENVIRONMENT
// ============================================================

const PORT =
    process.env.PORT || 10000;

const NODE_ENV =
    process.env.NODE_ENV ||
    "development";


// ============================================================
// JWT CONFIGURATION
// ============================================================

const JWT_SECRET =
    process.env.JWT_SECRET;

const JWT_EXPIRES_IN =
    process.env.JWT_EXPIRES_IN ||
    "1h";

const JWT_ISSUER =
    "priyanshu-secure-portal";

const JWT_AUDIENCE =
    "secure-auth-portal";


// ============================================================
// RESEND EMAIL CONFIGURATION
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

        origin: function (
            origin,
            callback
        ) {

            if (!origin) {
                return callback(
                    null,
                    true
                );
            }

            if (
                allowedOrigins.includes(
                    origin
                )
            ) {

                return callback(
                    null,
                    true
                );

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
// GENERAL RATE LIMIT
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

app.use(
    generalLimiter
);


// ============================================================
// AUTH RATE LIMIT
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
// HELPERS
// ============================================================

function normalizeEmail(
    email
) {

    return String(
        email || ""
    )
        .trim()
        .toLowerCase();

}


function isValidEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


function isValidPassword(
    password
) {

    return (
        typeof password ===
            "string" &&
        password.length >= 6 &&
        password.length <= 128
    );

}


function isValidName(
    name
) {

    return (
        typeof name ===
            "string" &&
        name.trim().length >= 2 &&
        name.trim().length <= 100
    );

}


function safeUser(
    user
) {

    if (!user) {
        return null;
    }

    return {

        id: user.id,

        name: user.name,

        email: user.email,

        created_at:
            user.created_at

    };

}


// ============================================================
// JWT GENERATOR
// ============================================================

function generateAccessToken(
    user
) {

    return jwt.sign(

        {
            sub:
                String(user.id),

            email:
                user.email,

            name:
                user.name

        },

        JWT_SECRET,

        {

            expiresIn:
                JWT_EXPIRES_IN,

            issuer:
                JWT_ISSUER,

            audience:
                JWT_AUDIENCE,

            algorithm:
                "HS256"

        }

    );

}


// ============================================================
// JWT AUTHENTICATION MIDDLEWARE
// ============================================================

function authenticateToken(
    req,
    res,
    next
) {

    const authHeader =
        req.headers.authorization;

    if (
        !authHeader ||
        !authHeader.startsWith(
            "Bearer "
        )
    ) {

        return res.status(401).json({

            success: false,

            message:
                "Authentication required."

        });

    }

    const token =
        authHeader.substring(7);

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

                    issuer:
                        JWT_ISSUER,

                    audience:
                        JWT_AUDIENCE,

                    algorithms: [
                        "HS256"
                    ]

                }

            );

        req.user =
            decoded;

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

    // Create the table for new databases.
    await pool.query(`
        CREATE TABLE IF NOT EXISTS activity_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            email TEXT,
            action TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMPTZ
                DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Migration for older activity_logs tables.
    await pool.query(`
        ALTER TABLE activity_logs
        ADD COLUMN IF NOT EXISTS user_id INTEGER;
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

    // Legacy compatibility: older activity_logs tables may contain a
    // required `name` column. The current logger does not depend on it,
    // so make it optional instead of allowing logging to break requests.
    await pool.query(`
        ALTER TABLE activity_logs
        ADD COLUMN IF NOT EXISTS name TEXT;
    `);

    await pool.query(`
        ALTER TABLE activity_logs
        ALTER COLUMN name DROP NOT NULL;
    `);

    // Give old rows a safe action value before enforcing NOT NULL.
    await pool.query(`
        UPDATE activity_logs
        SET action = 'LEGACY_LOG'
        WHERE action IS NULL;
    `);

    await pool.query(`
        ALTER TABLE activity_logs
        ALTER COLUMN action SET NOT NULL;
    `);

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
        "PostgreSQL activity_logs table and migrations are ready."
    );

}


// ============================================================
// EXCEL ACTIVITY LOGGER
// ============================================================

function logToExcel(
    data
) {

    try {

        const dataDirectory =
            path.join(
                __dirname,
                "..",
                "data"
            );

        if (
            !fs.existsSync(
                dataDirectory
            )
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
            fs.existsSync(
                filePath
            )
        ) {

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

        }

        rows.push({

            Timestamp:
                new Date().toISOString(),

            User_ID:
                data.userId || "",

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
    email = null
) {

    const ip =
        req.headers[
            "x-forwarded-for"
        ] ||
        req.socket.remoteAddress ||
        "";

    const userAgent =
        req.headers[
            "user-agent"
        ] ||
        "";

    try {

        await pool.query(

            `

            INSERT INTO activity_logs

            (
                user_id,
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
                $5
            )

            `,

            [
                userId,
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

    logToExcel({

        userId,

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


    const emailHtml = `

<!DOCTYPE html>

<html>

<head>

    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width,
                   initial-scale=1.0">

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

        Hello ${
            recipientName || "there"
        },

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
        <strong>
            15 minutes
        </strong>
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


    const response =
        await fetch(
            "https://api.resend.com/emails",
            {

                method:
                    "POST",

                headers: {

                    "Authorization":
                        `Bearer ${RESEND_API_KEY}`,

                    "Content-Type":
                        "application/json"

                },

                body:
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

                    })

            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "Resend API error:",
            data
        );

        throw new Error(
            "Password reset email could not be sent."
        );

    }


    console.log(
        "Password reset email sent:",
        data.id
    );


    return data;

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
                "2.8.1",

            status:
                "online",

            security: {

                helmet:
                    true,

                cors:
                    true,

                rateLimiting:
                    true,

                bcrypt:
                    true,

                jwt:
                    true,

                postgresql:
                    true,

                passwordRecovery:
                    true,

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

            res.json({

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


            if (!isValidName(name)) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Name must contain between 2 and 100 characters."

                });

            }


            if (
                !isValidEmail(
                    email
                )
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
                !isValidPassword(
                    password
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
                error.code ===
                "23505"
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


            if (
                !isValidEmail(
                    email
                )
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
                typeof password !==
                "string" ||
                password.length ===
                0
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Password is required."

                });

            }


            const user =
                await findUserByEmail(
                    email
                );


            if (!user) {

                await logActivity(
                    req,
                    "LOGIN_FAILED",
                    null,
                    email
                );

                return res.status(
                    401
                ).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            const passwordMatches =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );


            if (
                !passwordMatches
            ) {

                await logActivity(
                    req,
                    "LOGIN_FAILED",
                    user.id,
                    user.email
                );

                return res.status(
                    401
                ).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            const token =
                generateAccessToken(
                    user
                );


            await logActivity(
                req,
                "LOGIN_SUCCESS",
                user.id,
                user.email
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

        const genericMessage =
            "If an account exists for this email, password reset instructions will be sent.";

        try {

            const email =
                normalizeEmail(
                    req.body.email
                );


            if (
                !isValidEmail(
                    email
                )
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Please provide a valid email address."

                });

            }


            const user =
                await findUserByEmail(
                    email
                );


            // ------------------------------------------------
            // Do not reveal whether account exists
            // ------------------------------------------------

            if (!user) {

                await logActivity(
                    req,
                    "PASSWORD_RESET_REQUEST",
                    null,
                    email
                );

                return res.json({

                    success: true,

                    message:
                        genericMessage

                });

            }


            // ------------------------------------------------
            // Generate cryptographically secure token
            // ------------------------------------------------

            const rawResetToken =
                crypto
                    .randomBytes(32)
                    .toString("hex");


            // ------------------------------------------------
            // Store only SHA-256 hash
            // ------------------------------------------------

            const tokenHash =
                crypto
                    .createHash(
                        "sha256"
                    )
                    .update(
                        rawResetToken
                    )
                    .digest("hex");


            // ------------------------------------------------
            // Token expires in 15 minutes
            // ------------------------------------------------

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
            // Send email through Resend
            // ------------------------------------------------

            try {

                await sendPasswordResetEmail(

                    user.email,

                    user.name,

                    rawResetToken

                );

            } catch (emailError) {

                console.error(
                    "PASSWORD RESET EMAIL ERROR:",
                    emailError.message
                );


                // Remove token if email failed
                await deleteExpiredResetTokens();


                await logActivity(
                    req,
                    "PASSWORD_RESET_EMAIL_FAILED",
                    user.id,
                    user.email
                );


                return res.status(
                    500
                ).json({

                    success: false,

                    message:
                        "Unable to send password reset email. Please try again later."

                });

            }


            await logActivity(
                req,
                "PASSWORD_RESET_REQUEST",
                user.id,
                user.email
            );


            return res.json({

                success: true,

                message:
                    genericMessage

            });


        } catch (error) {

            console.error(
                "FORGOT PASSWORD ERROR:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to process password recovery."

            });

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

            const password =
                req.body.password;


            if (
                !/^[a-fA-F0-9]{64}$/
                    .test(token)
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Invalid or expired reset token."

                });

            }


            if (
                !isValidPassword(
                    password
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


            const tokenHash =
                crypto
                    .createHash(
                        "sha256"
                    )
                    .update(
                        token
                    )
                    .digest("hex");


            const resetToken =
                await findValidPasswordResetToken(
                    tokenHash
                );


            if (!resetToken) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Invalid or expired reset token."

                });

            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            const updatedUser =
                await updateUserPassword(

                    resetToken.user_id,

                    passwordHash

                );


            if (!updatedUser) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Unable to reset password."

                });

            }


            // ------------------------------------------------
            // One-time token
            // ------------------------------------------------

            await markPasswordResetTokenUsed(
                resetToken.id
            );


            await deleteExpiredResetTokens();


            await logActivity(
                req,
                "PASSWORD_RESET",
                updatedUser.id,
                updatedUser.email
            );


            return res.json({

                success: true,

                message:
                    "Password has been reset successfully."

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

            const user =
                await findUserById(
                    Number(
                        req.user.sub
                    )
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
                "ME ERROR:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to retrieve account information."

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
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "GLOBAL ERROR:",
            error.message
        );


        if (
            error.message ===
            "CORS origin not allowed."
        ) {

            return res.status(
                403
            ).json({

                success: false,

                message:
                    "Origin is not allowed."

            });

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
// START SERVER
// ============================================================

async function startServer() {

    try {

        await initializeDatabase();

        await initializeActivityLogs();

        await deleteExpiredResetTokens();


        app.listen(
            PORT,
            () => {

                console.log(
                    "============================================================"
                );

                console.log(
                    "PRIYANSHU SECURE PORTAL"
                );

                console.log(
                    "============================================================"
                );

                console.log(
                    `Server running on port ${PORT}`
                );

                console.log(
                    `Environment: ${NODE_ENV}`
                );

                console.log(
                    "PostgreSQL: CONNECTED"
                );

                console.log(
                    "JWT: ACTIVE"
                );

                console.log(
                    "bcrypt: ACTIVE"
                );

                console.log(
                    "Helmet: ACTIVE"
                );

                console.log(
                    "CORS: ACTIVE"
                );

                console.log(
                    "Rate Limiting: ACTIVE"
                );

                console.log(
                    "Password Recovery: ACTIVE"
                );

                console.log(
                    `Resend Email: ${
                        RESEND_API_KEY
                            ? "CONFIGURED"
                            : "NOT CONFIGURED"
                    }`
                );

                console.log(
                    "============================================================"
                );

            }
        );


    } catch (error) {

        console.error(
            "SERVER STARTUP FAILED:",
            error
        );

        process.exit(
            1
        );

    }

}


// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

async function shutdown(
    signal
) {

    console.log(
        `${signal} received. Shutting down...`
    );


    try {

        await closeDatabase();

        console.log(
            "Database connection closed."
        );

        process.exit(
            0
        );

    } catch (error) {

        console.error(
            "Shutdown error:",
            error
        );

        process.exit(
            1
        );

    }

}


process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
);

process.on(
    "SIGINT",
    () => shutdown("SIGINT")
);


// ============================================================
// START
// ============================================================

startServer();
