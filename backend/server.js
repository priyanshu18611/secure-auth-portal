// ============================================================
// PRIYANSHU SECURE PORTAL
// Production Authentication Server
// PostgreSQL + bcrypt + Helmet + Activity Logging
// ============================================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
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
const PORT = process.env.PORT || 5000;

// Hide Express technology fingerprint
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
// CORS
// ============================================================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

// ============================================================
// JSON BODY PARSER
// ============================================================

app.use(
    express.json({
        limit: "1mb"
    })
);

// ============================================================
// DATA / EXCEL CONFIGURATION
// ============================================================

const dataDir = path.join(
    __dirname,
    "../data"
);

const excelFile = path.join(
    dataDir,
    "login_activity.xlsx"
);

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, {
        recursive: true
    });
}

// ============================================================
// CREATE EXCEL FILE IF NOT EXISTS
// ============================================================

function createExcelFile() {
    try {
        if (fs.existsSync(excelFile)) {
            return;
        }

        const worksheet =
            XLSX.utils.json_to_sheet([]);

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
// ACTIVITY LOGGING
// PostgreSQL = persistent source
// Excel = local report copy
// ============================================================

async function saveActivity(
    name,
    email,
    action
) {
    // --------------------------------------------------------
    // PostgreSQL activity log
    // --------------------------------------------------------

    try {
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
    // Excel activity report
    // --------------------------------------------------------

    try {
        const workbook =
            fs.existsSync(excelFile)
                ? XLSX.readFile(excelFile)
                : XLSX.utils.book_new();

        let worksheet =
            workbook.Sheets["Activity"];

        let records = [];

        if (worksheet) {
            records =
                XLSX.utils.sheet_to_json(
                    worksheet
                );
        } else {
            worksheet =
                XLSX.utils.json_to_sheet([]);

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

        workbook.Sheets["Activity"] =
            worksheet;

        XLSX.writeFile(
            workbook,
            excelFile
        );

        console.log(
            `Excel activity saved: ${action}`
        );
    } catch (error) {
        console.error(
            "EXCEL ACTIVITY LOG ERROR:",
            error.message
        );
    }
}

// ============================================================
// ROOT / API STATUS
// ============================================================

app.get(
    "/",
    (req, res) => {
        res.json({
            success: true,

            message:
                "Priyanshu Secure Portal API is running.",

            version:
                "2.1.0",

            database:
                "PostgreSQL",

            security:
                "Helmet enabled"
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

                security:
                    "helmet-enabled"
            });
        } catch (error) {
            console.error(
                "HEALTH CHECK ERROR:",
                error.message
            );

            return res.status(500).json({
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
    async (req, res) => {
        try {
            const {
                name,
                email,
                password
            } = req.body;

            // ------------------------------------------------
            // Required fields
            // ------------------------------------------------

            if (
                !name ||
                !email ||
                !password
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Name, email and password are required."
                });
            }

            // ------------------------------------------------
            // Clean input
            // ------------------------------------------------

            const cleanName =
                String(name).trim();

            const cleanEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            // ------------------------------------------------
            // Name validation
            // ------------------------------------------------

            if (
                cleanName.length < 2 ||
                cleanName.length > 100
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Please enter a valid name."
                });
            }

            // ------------------------------------------------
            // Email validation
            // ------------------------------------------------

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (
                !emailPattern.test(
                    cleanEmail
                )
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Please enter a valid email address."
                });
            }

            // ------------------------------------------------
            // Password validation
            // ------------------------------------------------

            if (
                password.length < 6
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Password must contain at least 6 characters."
                });
            }

            if (
                password.length > 128
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Password is too long."
                });
            }

            // ------------------------------------------------
            // Check existing user
            // ------------------------------------------------

            const existingUser =
                await findUserByEmail(
                    cleanEmail
                );

            if (existingUser) {
                return res.status(409).json({
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
            // Create PostgreSQL user
            // ------------------------------------------------

            const newUser =
                await createUser(
                    cleanName,
                    cleanEmail,
                    passwordHash
                );

            // ------------------------------------------------
            // Log registration
            // ------------------------------------------------

            await saveActivity(
                newUser.name,
                newUser.email,
                "REGISTER"
            );

            // ------------------------------------------------
            // Response
            // ------------------------------------------------

            return res.status(201).json({
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
                error
            );

            // PostgreSQL duplicate email
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
    }
);

// ============================================================
// LOGIN
// ============================================================

app.post(
    "/api/login",
    async (req, res) => {
        try {
            const {
                email,
                password
            } = req.body;

            // ------------------------------------------------
            // Required fields
            // ------------------------------------------------

            if (
                !email ||
                !password
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Email and password are required."
                });
            }

            // ------------------------------------------------
            // Clean email
            // ------------------------------------------------

            const cleanEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            // ------------------------------------------------
            // Find user
            // ------------------------------------------------

            const user =
                await findUserByEmail(
                    cleanEmail
                );

            if (!user) {
                return res.status(401).json({
                    success: false,

                    message:
                        "Invalid email or password."
                });
            }

            // ------------------------------------------------
            // Verify password
            // ------------------------------------------------

            const passwordValid =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );

            if (!passwordValid) {
                return res.status(401).json({
                    success: false,

                    message:
                        "Invalid email or password."
                });
            }

            // ------------------------------------------------
            // Log successful login
            // ------------------------------------------------

            await saveActivity(
                user.name,
                user.email,
                "LOGIN"
            );

            // ------------------------------------------------
            // Response
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
                error
            );

            return res.status(500).json({
                success: false,

                message:
                    "Unable to process login."
            });
        }
    }
);

// ============================================================
// 404 HANDLER
// ============================================================

app.use(
    (req, res) => {
        res.status(404).json({
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
            error
        );

        res.status(500).json({
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

        // Create activity table during startup
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
            "✅ PostgreSQL users table is ready."
        );

        console.log(
            "✅ PostgreSQL activity_logs table is ready."
        );

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
            }
        );

    } catch (error) {
        console.error(
            "DATABASE INITIALIZATION FAILED:",
            error
        );

        process.exit(1);
    }
}

// ============================================================
// START APPLICATION
// ============================================================

startServer();
