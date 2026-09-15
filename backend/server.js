// ============================================================
// PRIYANSHU SECURE PORTAL
// Secure Authentication API
// JWT + PostgreSQL + bcrypt + Rate Limiting + Helmet
// ============================================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const {
    pool,
    initializeDatabase,
    createUser,
    findUserByEmail
} = require("./database");

// ============================================================
// APP
// ============================================================

const app = express();

const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || "development";

app.set("trust proxy", 1);
app.disable("x-powered-by");

// ============================================================
// JWT CONFIGURATION
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
        "JWT_SECRET is missing or too short. Configure a strong secret in Render Environment Variables."
    );
}

const JWT_ISSUER = "priyanshu-secure-portal";
const JWT_AUDIENCE = "secure-auth-portal";

// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
    "https://priyanshu18611.github.io"
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow server-to-server / health checks without browser origin
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
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ],
        credentials: false
    })
);

// ============================================================
// SECURITY HEADERS
// ============================================================

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

// ============================================================
// BODY PARSER
// ============================================================

app.use(
    express.json({
        limit: "10kb"
    })
);

// ============================================================
// RATE LIMITING
// ============================================================

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts. Please try again later."
    }
});

app.use("/api/", generalLimiter);

app.use(
    ["/api/register", "/api/login"],
    authLimiter
);

// ============================================================
// HELPERS
// ============================================================

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function normalizeName(value) {
    return String(value || "")
        .normalize("NFKC")
        .replace(/\s+/g, " ")
        .trim();
}

function isValidName(name) {
    return (
        name.length >= 2 &&
        name.length <= 100 &&
        /^[\p{L}\p{M} .'-]+$/u.test(name)
    );
}

function normalizeEmail(value) {
    return String(value || "")
        .normalize("NFKC")
        .trim()
        .toLowerCase();
}

function isValidEmail(email) {
    return (
        email.length >= 5 &&
        email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
}

function isValidPassword(password) {
    return (
        typeof password === "string" &&
        password.length >= 6 &&
        password.length <= 128
    );
}

function hasOnlyAllowedFields(body, allowedFields) {
    const keys = Object.keys(body);

    return keys.every(
        key => allowedFields.includes(key)
    );
}

// ============================================================
// ACTIVITY LOGGING
// ============================================================

async function initializeActivityLogs() {
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

    console.log(
        "PostgreSQL activity_logs table is ready."
    );
}

async function logActivity({
    userId = null,
    email = null,
    action,
    ipAddress = null,
    userAgent = null
}) {
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
                ipAddress,
                userAgent
            ]
        );

        writeExcelActivity({
            userId,
            email,
            action,
            ipAddress,
            userAgent
        });

    } catch (error) {
        console.error(
            "Activity logging error:",
            error.message
        );
    }
}

// ============================================================
// EXCEL ACTIVITY REPORT
// ============================================================

function writeExcelActivity({
    userId,
    email,
    action,
    ipAddress,
    userAgent
}) {
    try {
        const dataDirectory = path.join(
            __dirname,
            "..",
            "data"
        );

        if (!fs.existsSync(dataDirectory)) {
            fs.mkdirSync(
                dataDirectory,
                { recursive: true }
            );
        }

        const filePath = path.join(
            dataDirectory,
            "activity_report.xlsx"
        );

        let rows = [];

        if (fs.existsSync(filePath)) {
            try {
                const workbook =
                    XLSX.readFile(filePath);

                const sheet =
                    workbook.Sheets["Activity"];

                if (sheet) {
                    rows =
                        XLSX.utils.sheet_to_json(sheet);
                }
            } catch (error) {
                console.warn(
                    "Existing Excel report could not be read."
                );
            }
        }

        rows.push({
            User_ID: userId || "",
            Email: email || "",
            Action: action,
            IP_Address: ipAddress || "",
            User_Agent: userAgent || "",
            Timestamp: new Date().toISOString()
        });

        const workbook =
            XLSX.utils.book_new();

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Activity"
        );

        XLSX.writeFile(
            workbook,
            filePath
        );

    } catch (error) {
        console.error(
            "Excel activity logging error:",
            error.message
        );
    }
}

// ============================================================
// JWT TOKEN GENERATION
// ============================================================

function generateAccessToken(user) {
    return jwt.sign(
        {
            sub: String(user.id),
            email: user.email
        },
        JWT_SECRET,
        {
            algorithm: "HS256",
            expiresIn: JWT_EXPIRES_IN,
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE
        }
    );
}

// ============================================================
// JWT AUTHENTICATION MIDDLEWARE
// ============================================================

function authenticateToken(req, res, next) {
    try {
        const authHeader =
            req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                message: "Authentication token required."
            });
        }

        const token =
            authHeader.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token required."
            });
        }

        const decoded = jwt.verify(
            token,
            JWT_SECRET,
            {
                algorithms: ["HS256"],
                issuer: JWT_ISSUER,
                audience: JWT_AUDIENCE
            }
        );

        req.user = decoded;

        next();

    } catch (error) {
        if (
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Authentication token has expired."
            });
        }

        return res.status(401).json({
            success: false,
            message: "Invalid authentication token."
        });
    }
}

// ============================================================
// ROOT
// ============================================================

app.get("/", async (req, res) => {
    res.json({
        success: true,
        message: "Priyanshu Secure Portal API is running.",
        version: "2.6.0",
        environment: NODE_ENV,
        database: "PostgreSQL",
        authentication: "JWT",
        security: {
            helmet: true,
            rateLimiting: true,
            strictCors: true,
            inputValidation: true,
            secureErrors: true,
            jwt: true
        }
    });
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            success: true,
            api: "online",
            database: "connected"
        });

    } catch (error) {
        console.error(
            "Health check error:",
            error.message
        );

        res.status(503).json({
            success: false,
            api: "online",
            database: "disconnected"
        });
    }
});

// ============================================================
// REGISTER
// ============================================================

app.post("/api/register", async (req, res) => {
    try {
        if (!isPlainObject(req.body)) {
            return res.status(400).json({
                success: false,
                message: "Invalid request body."
            });
        }

        if (
            !hasOnlyAllowedFields(
                req.body,
                ["name", "email", "password"]
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid registration fields."
            });
        }

        const name =
            normalizeName(req.body.name);

        const email =
            normalizeEmail(req.body.email);

        const password =
            req.body.password;

        if (!isValidName(name)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid name."
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address."
            });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must contain 6 to 128 characters."
            });
        }

        const existingUser =
            await findUserByEmail(email);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message:
                    "An account with this email already exists."
            });
        }

        const passwordHash =
            await bcrypt.hash(password, 12);

        const user =
            await createUser(
                name,
                email,
                passwordHash
            );

        await logActivity({
            userId: user.id,
            email: user.email,
            action: "REGISTER",
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        });

        return res.status(201).json({
            success: true,
            message:
                "Account created successfully.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error(
            "REGISTER ERROR:",
            error
        );

        if (
            error.code === "23505"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "An account with this email already exists."
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to create account."
        });
    }
});

// ============================================================
// LOGIN + JWT
// ============================================================

app.post("/api/login", async (req, res) => {
    try {
        if (!isPlainObject(req.body)) {
            return res.status(400).json({
                success: false,
                message: "Invalid request body."
            });
        }

        if (
            !hasOnlyAllowedFields(
                req.body,
                ["email", "password"]
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid login fields."
            });
        }

        const email =
            normalizeEmail(req.body.email);

        const password =
            req.body.password;

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide a valid email address."
            });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid email or password."
            });
        }

        const user =
            await findUserByEmail(email);

        if (!user) {
            await logActivity({
                email,
                action: "LOGIN_FAILED",
                ipAddress: req.ip,
                userAgent: req.get("user-agent")
            });

            return res.status(401).json({
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

        if (!passwordMatches) {
            await logActivity({
                userId: user.id,
                email: user.email,
                action: "LOGIN_FAILED",
                ipAddress: req.ip,
                userAgent: req.get("user-agent")
            });

            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password."
            });
        }

        const safeUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            created_at: user.created_at
        };

        const token =
            generateAccessToken(safeUser);

        await logActivity({
            userId: user.id,
            email: user.email,
            action: "LOGIN",
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        });

        return res.json({
            success: true,
            message: "Login successful.",
            token,
            expiresIn: JWT_EXPIRES_IN,
            user: safeUser
        });

    } catch (error) {
        console.error(
            "LOGIN ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to process login."
        });
    }
});

// ============================================================
// PROTECTED USER PROFILE
// ============================================================

app.get(
    "/api/me",
    authenticateToken,
    async (req, res) => {
        try {
            const userId =
                Number(req.user.sub);

            if (
                !Number.isInteger(userId) ||
                userId <= 0
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid authentication identity."
                });
            }

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

            if (
                result.rows.length === 0
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        "User account no longer exists."
                });
            }

            const user =
                result.rows[0];

            return res.json({
                success: true,
                authenticated: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    created_at: user.created_at
                }
            });

        } catch (error) {
            console.error(
                "ME ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load authenticated user."
            });
        }
    }
);

// ============================================================
// 404
// ============================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found."
    });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((error, req, res, next) => {
    console.error(
        "GLOBAL ERROR:",
        error.message
    );

    if (
        error.message ===
        "CORS origin not allowed."
    ) {
        return res.status(403).json({
            success: false,
            message: "Origin not allowed."
        });
    }

    if (
        error instanceof SyntaxError &&
        error.status === 400 &&
        error.type === "entity.parse.failed"
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON request."
        });
    }

    return res.status(500).json({
        success: false,
        message:
            "An internal server error occurred."
    });
});

// ============================================================
// START SERVER
// ============================================================

async function startServer() {
    try {
        await initializeDatabase();

        await initializeActivityLogs();

        app.listen(PORT, () => {
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
                "JWT authentication enabled."
            );

            console.log(
                `JWT expiry: ${JWT_EXPIRES_IN}`
            );

            console.log(
                `Environment: ${NODE_ENV}`
            );
        });

    } catch (error) {
        console.error(
            "SERVER STARTUP ERROR:",
            error
        );

        process.exit(1);
    }
}

startServer();
