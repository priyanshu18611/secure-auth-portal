// ============================================================
// PRIYANSHU SECURE PORTAL
// Production Authentication Server
// PostgreSQL + bcrypt + Helmet + Rate Limiting
// Strict CORS + Input Validation + Secure Error Handling
// ============================================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const {
    initializeDatabase,
    createUser,
    findUserByEmail,
    pool
} = require("./database");

// ============================================================
// APP CONFIGURATION
// ============================================================

const app = express();

const PORT =
    process.env.PORT || 5000;

const NODE_ENV =
    process.env.NODE_ENV || "production";

const IS_PRODUCTION =
    NODE_ENV === "production";

// Render runs behind a proxy.
// This allows Express to correctly identify client IPs
// for rate limiting.
app.set("trust proxy", 1);

// Hide Express technology fingerprint.
app.disable("x-powered-by");

// ============================================================
// HELMET SECURITY
// ============================================================

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

// ============================================================
// STRICT CORS
// ============================================================

const allowedOrigins = [
    "https://priyanshu18611.github.io"
];

const corsOptions = {
    origin: function (origin, callback) {

        // Direct requests without Origin header are allowed.
        // Example: health checks/server-to-server requests.
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
                "CORS policy: Origin not allowed."
            )
        );
    },

    credentials: true,

    methods: [
        "GET",
        "POST",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ]
};

app.use(
    cors(corsOptions)
);

// ============================================================
// JSON BODY PARSER
// ============================================================

app.use(
    express.json({
        limit: "1mb",
        strict: true
    })
);

// ============================================================
// GENERAL API RATE LIMIT
// ============================================================

const generalLimiter =
    rateLimit({
        windowMs:
            15 * 60 * 1000,

        limit: 300,

        standardHeaders:
            "draft-8",

        legacyHeaders:
            false,

        message: {
            success: false,

            message:
                "Too many requests. Please try again later."
        }
    });

app.use(
    "/api/",
    generalLimiter
);

// ============================================================
// AUTHENTICATION RATE LIMIT
// ============================================================

const authLimiter =
    rateLimit({
        windowMs:
            15 * 60 * 1000,

        limit: 10,

        standardHeaders:
            "draft-8",

        legacyHeaders:
            false,

        message: {
            success: false,

            message:
                "Too many authentication attempts. Please try again after 15 minutes."
        }
    });

// ============================================================
// DATA / EXCEL CONFIGURATION
// ============================================================

const dataDir =
    path.join(
        __dirname,
        "../data"
    );

const excelFile =
    path.join(
        dataDir,
        "login_activity.xlsx"
    );

if (
    !fs.existsSync(dataDir)
) {
    fs.mkdirSync(
        dataDir,
        {
            recursive: true
        }
    );
}

// ============================================================
// CREATE EXCEL FILE
// ============================================================

function createExcelFile() {

    try {

        if (
            fs.existsSync(
                excelFile
            )
        ) {
            return;
        }

        const worksheet =
            XLSX.utils.json_to_sheet(
                []
            );

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Activity"
        );

        XLSX.writeFile(
            workbook,
            excelFile
        );

        console.log(
            "Excel activity file initialized."
        );

    } catch (error) {

        console.error(
            "EXCEL INITIALIZATION ERROR:",
            error.message
        );
    }
}

createExcelFile();

// ============================================================
// INPUT VALIDATION HELPERS
// ============================================================

function isPlainObject(
    value
) {

    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

// ------------------------------------------------------------
// Name normalization
// ------------------------------------------------------------

function normalizeName(
    value
) {

    if (
        typeof value !== "string"
    ) {
        return null;
    }

    return value
        .normalize("NFKC")
        .replace(/\s+/g, " ")
        .trim();
}

// ------------------------------------------------------------
// Name validation
// ------------------------------------------------------------

function isValidName(
    name
) {

    if (
        typeof name !== "string" ||
        name.length < 2 ||
        name.length > 100
    ) {
        return false;
    }

    return /^[\p{L}\p{M} .'-]+$/u.test(
        name
    );
}

// ------------------------------------------------------------
// Email normalization
// ------------------------------------------------------------

function normalizeEmail(
    value
) {

    if (
        typeof value !== "string"
    ) {
        return null;
    }

    return value
        .normalize("NFKC")
        .trim()
        .toLowerCase();
}

// ------------------------------------------------------------
// Email validation
// ------------------------------------------------------------

function isValidEmail(
    email
) {

    if (
        typeof email !== "string" ||
        email.length < 3 ||
        email.length > 254
    ) {
        return false;
    }

    if (
        /\s/.test(email)
    ) {
        return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );
}

// ------------------------------------------------------------
// Password validation
// ------------------------------------------------------------

function isValidPassword(
    password
) {

    if (
        typeof password !== "string"
    ) {
        return false;
    }

    return (
        password.length >= 6 &&
        password.length <= 128
    );
}

// ------------------------------------------------------------
// Allowed fields validation
// ------------------------------------------------------------

function hasOnlyAllowedFields(
    body,
    allowedFields
) {

    if (
        !isPlainObject(body)
    ) {
        return false;
    }

    return Object.keys(body).every(
        field =>
            allowedFields.includes(
                field
            )
    );
}

// ============================================================
// ACTIVITY LOGGING
// ============================================================

async function saveActivity(
    name,
    email,
    action
) {

    // --------------------------------------------------------
    // PostgreSQL
    // --------------------------------------------------------

    try {

        await pool.query(
            `
            INSERT INTO activity_logs
            (
                name,
                email,
                action
            )
            VALUES
            (
                $1,
                $2,
                $3
            );
            `,
            [
                name,
                email,
                action
            ]
        );

        console.log(
            `Activity logged: ${action} - ${email}`
        );

    } catch (error) {

        console.error(
            "POSTGRES ACTIVITY LOG ERROR:",
            error.message
        );
    }

    // --------------------------------------------------------
    // Excel
    // --------------------------------------------------------

    try {

        const workbook =
            fs.existsSync(
                excelFile
            )
                ? XLSX.readFile(
                    excelFile
                )
                : XLSX.utils.book_new();

        let worksheet =
            workbook.Sheets[
                "Activity"
            ];

        let records = [];

        if (worksheet) {

            records =
                XLSX.utils.sheet_to_json(
                    worksheet
                );

        } else {

            worksheet =
                XLSX.utils.json_to_sheet(
                    []
                );

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Activity"
            );
        }

        const now =
            new Date();

        records.push({
            ID:
                records.length + 1,

            Name:
                name,

            Email:
                email,

            Action:
                action,

            Date:
                now.toLocaleDateString(
                    "en-IN"
                ),

            Time:
                now.toLocaleTimeString(
                    "en-IN"
                )
        });

        worksheet =
            XLSX.utils.json_to_sheet(
                records
            );

        workbook.Sheets[
            "Activity"
        ] = worksheet;

        XLSX.writeFile(
            workbook,
            excelFile
        );

    } catch (error) {

        console.error(
            "EXCEL ACTIVITY LOG ERROR:",
            error.message
        );
    }
}

// ============================================================
// ROOT API
// ============================================================

app.get(
    "/",
    (req, res) => {

        res.json({
            success: true,

            message:
                "Priyanshu Secure Portal API is running.",

            version:
                "2.5.0",

            environment:
                IS_PRODUCTION
                    ? "production"
                    : "development",

            database:
                "PostgreSQL",

            security:
                "Helmet + Rate Limiting + Strict CORS + Input Validation"
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
                    "connected",

                environment:
                    IS_PRODUCTION
                        ? "production"
                        : "development",

                security:
                    "enabled"
            });

        } catch (error) {

            console.error(
                "HEALTH CHECK ERROR:",
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

            // ------------------------------------------------
            // Request body
            // ------------------------------------------------

            if (
                !isPlainObject(
                    req.body
                )
            ) {

                return res.status(
                    400
                ).json({
                    success: false,

                    message:
                        "Invalid request body."
                });
            }

            // ------------------------------------------------
            // Allowed fields
            // ------------------------------------------------

            if (
                !hasOnlyAllowedFields(
                    req.body,
                    [
                        "name",
                        "email",
                        "password"
                    ]
                )
            ) {

                return res.status(
                    400
                ).json({
                    success: false,

                    message:
                        "Request contains unsupported fields."
                });
            }

            const {
                name,
                email,
                password
            } = req.body;

            // ------------------------------------------------
            // Type validation
            // ------------------------------------------------

            if (
                typeof name !== "string" ||
                typeof email !== "string" ||
                typeof password !== "string"
            ) {

                return res.status(
                    400
                ).json({
                    success: false,

                    message:
                        "Name, email and password are required."
                });
            }

            // ------------------------------------------------
            // Normalize
            // ------------------------------------------------

            const cleanName =
                normalizeName(
                    name
                );

            const cleanEmail =
                normalizeEmail(
                    email
                );

            // ------------------------------------------------
            // Name
            // ------------------------------------------------

            if (
                !isValidName(
                    cleanName
                )
            ) {

                return res.status(
                    400
                ).json({
                    success: false,

                    message:
                        "Please enter a valid name."
                });
            }

            // ------------------------------------------------
            // Email
            // ------------------------------------------------

            if (
                !isValidEmail(
                    cleanEmail
                )
            ) {

                return res.status(
                    400
                ).json({
                    success: false,

                    message:
                        "Please enter a valid email address."
                });
            }

            // ------------------------------------------------
            // Password
            // ------------------------------------------------

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
                        "Password must contain 6 to 128 characters."
                });
            }

            // ------------------------------------------------
            // Existing account
            // ------------------------------------------------

            const existingUser =
                await findUserByEmail(
                    cleanEmail
                );

            if (
                existingUser
            ) {

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

            const newUser =
                await createUser(
                    cleanName,
                    cleanEmail,
                    passwordHash
                );

            // ------------------------------------------------
            // Activity
            // ------------------------------------------------

            await saveActivity(
                newUser.name,
                newUser.email,
                "REGISTER"
            );

            // ------------------------------------------------
            // Safe response
            // ------------------------------------------------

            return res.status(
                201
            ).json({

                success: true,

                message:
                    "Account created successfully.",

                user: {
                    id:
                        newUser.id,

                    name:
                        newUser.name,

                    email:
                        newUser.email
                }
            });

        } catch (error) {

            console.error(
                "REGISTER ERROR:",
                error.message
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
                    "Unable to create account. Please try again later."
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

            // ------------------------------------------------
            // Request body
            // ------------------------------------------------

            if (
                !isPlainObject(
                    req.body
                )
            ) {

                return res.status(
                    400
                ).json({
                    success: false,

                    message:
                        "Invalid request body."
                });
            }

            // ------------------------------------------------
            // Allowed fields
            // ------------------------------------------------

            if (
                !hasOnlyAllowedFields(
                    req.body,
                    [
                        "email",
                        "password"
                    ]
                )
            ) {

                return res.status(
                    400
                ).json({
                    success: false,

                    message:
                        "Request contains unsupported fields."
                });
            }

            const {
                email,
                password
            } = req.body;

            // ------------------------------------------------
            // Type validation
            // ------------------------------------------------

            if (
                typeof email !== "string" ||
                typeof password !== "string"
            ) {

                return res.status(
                    400
                ).json({
                    success: false,

                    message:
                        "Email and password are required."
                });
            }

            // ------------------------------------------------
            // Normalize email
            // ------------------------------------------------

            const cleanEmail =
                normalizeEmail(
                    email
                );

            // ------------------------------------------------
            // Email validation
            // ------------------------------------------------

            if (
                !isValidEmail(
                    cleanEmail
                )
            ) {

                return res.status(
                    400
                ).json({
                    success: false,

                    message:
                        "Invalid email or password."
                });
            }

            // ------------------------------------------------
            // Password validation
            // ------------------------------------------------

            if (
                !isValidPassword(
                    password
                )
            ) {

                return res.status(
                    401
                ).json({
                    success: false,

                    message:
                        "Invalid email or password."
                });
            }

            // ------------------------------------------------
            // Find user
            // ------------------------------------------------

            const user =
                await findUserByEmail(
                    cleanEmail
                );

            if (!user) {

                return res.status(
                    401
                ).json({
                    success: false,

                    message:
                        "Invalid email or password."
                });
            }

            // ------------------------------------------------
            // Compare password
            // ------------------------------------------------

            const passwordValid =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );

            if (
                !passwordValid
            ) {

                return res.status(
                    401
                ).json({
                    success: false,

                    message:
                        "Invalid email or password."
                });
            }

            // ------------------------------------------------
            // Activity
            // ------------------------------------------------

            await saveActivity(
                user.name,
                user.email,
                "LOGIN"
            );

            // ------------------------------------------------
            // Safe response
            // ------------------------------------------------

            return res.json({

                success: true,

                message:
                    "Login successful.",

                user: {
                    id:
                        user.id,

                    name:
                        user.name,

                    email:
                        user.email
                }
            });

        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error.message
            );

            return res.status(
                500
            ).json({
                success: false,

                message:
                    "Unable to process login. Please try again later."
            });
        }
    }
);

// ============================================================
// 404 HANDLER
// ============================================================

app.use(
    (req, res) => {

        return res.status(
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

        // ----------------------------------------------------
        // CORS error
        // ----------------------------------------------------

        if (
            error.message &&
            error.message.includes(
                "CORS policy"
            )
        ) {

            return res.status(
                403
            ).json({
                success: false,

                message:
                    "Request origin is not allowed."
            });
        }

        // ----------------------------------------------------
        // Invalid JSON
        // ----------------------------------------------------

        if (
            error instanceof SyntaxError &&
            error.status === 400 &&
            "body" in error
        ) {

            return res.status(
                400
            ).json({
                success: false,

                message:
                    "Invalid JSON request body."
            });
        }

        // ----------------------------------------------------
        // Production response
        // ----------------------------------------------------

        if (
            IS_PRODUCTION
        ) {

            return res.status(
                500
            ).json({
                success: false,

                message:
                    "Internal server error."
            });
        }

        // ----------------------------------------------------
        // Development response
        // ----------------------------------------------------

        return res.status(
            500
        ).json({
            success: false,

            message:
                "Internal server error.",

            error:
                error.message
        });
    }
);

// ============================================================
// START SERVER
// ============================================================

async function startServer() {

    try {

        // ----------------------------------------------------
        // Initialize PostgreSQL
        // ----------------------------------------------------

        await initializeDatabase();

        // ----------------------------------------------------
        // Activity table
        // ----------------------------------------------------

        await pool.query(
            `
            CREATE TABLE IF NOT EXISTS activity_logs (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                action TEXT NOT NULL,
                created_at TIMESTAMPTZ
                    DEFAULT CURRENT_TIMESTAMP
            );
            `
        );

        console.log(
            "PostgreSQL users table is ready."
        );

        console.log(
            "PostgreSQL activity_logs table is ready."
        );

        // ----------------------------------------------------
        // Start HTTP server
        // ----------------------------------------------------

        app.listen(
            PORT,
            () => {

                console.log(
                    `Priyanshu Secure Portal API running on port ${PORT}`
                );

                console.log(
                    "PostgreSQL database connected."
                );

                console.log(
                    "Helmet security enabled."
                );

                console.log(
                    "Rate limiting enabled."
                );

                console.log(
                    "Strict CORS enabled."
                );

                console.log(
                    "Input validation enabled."
                );

                console.log(
                    "Secure error handling enabled."
                );

                console.log(
                    `Environment: ${NODE_ENV}`
                );
            }
        );

    } catch (error) {

        // IMPORTANT:
        // Do not expose database credentials or stack traces.
        console.error(
            "DATABASE INITIALIZATION FAILED:",
            error.message
        );

        process.exit(1);
    }
}

// ============================================================
// START APPLICATION
// ============================================================

startServer();
