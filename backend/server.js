const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const {
    createUser,
    findUserByEmail
} = require("./database");

const app = express();

const PORT = process.env.PORT || 5000;


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(express.json());


// =====================================================
// DATA DIRECTORY
// =====================================================

const dataDir =
    path.join(__dirname, "../data");

const excelFile =
    path.join(dataDir, "login_activity.xlsx");


// =====================================================
// CREATE DATA DIRECTORY
// =====================================================

if (!fs.existsSync(dataDir)) {

    fs.mkdirSync(
        dataDir,
        {
            recursive: true
        }
    );

}


// =====================================================
// CREATE EXCEL REPORT
// =====================================================

function createExcelFile() {

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
}

createExcelFile();


// =====================================================
// SAVE ACTIVITY TO EXCEL
// =====================================================

function saveActivity(
    name,
    email,
    action
) {

    const workbook =
        XLSX.readFile(excelFile);

    let worksheet =
        workbook.Sheets["Activity"];

    let records =
        XLSX.utils.sheet_to_json(
            worksheet
        );


    const now =
        new Date();


    const record = {

        ID:
            records.length + 1,

        Name:
            name,

        Email:
            email,

        Action:
            action,

        Date:
            now.toLocaleDateString("en-IN"),

        Time:
            now.toLocaleTimeString("en-IN")

    };


    records.push(record);


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

}


// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Priyanshu Secure Portal API is running.",

            version:
                "1.0.0"

        });

    }
);


// =====================================================
// REGISTER API
// =====================================================

app.post(
    "/api/register",
    async (req, res) => {

        try {

            const {
                name,
                email,
                password
            } = req.body;


            // -----------------------------------------
            // VALIDATION
            // -----------------------------------------

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


            if (name.trim().length < 2) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid name."

                });

            }


            if (password.length < 6) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must contain at least 6 characters."

                });

            }


            // -----------------------------------------
            // CHECK EXISTING USER
            // -----------------------------------------

            const existingUser =
                findUserByEmail(
                    email.trim()
                );


            if (existingUser) {

                return res.status(409).json({

                    success: false,

                    message:
                        "An account with this email already exists."

                });

            }


            // -----------------------------------------
            // HASH PASSWORD
            // -----------------------------------------

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            // -----------------------------------------
            // SAVE USER
            // -----------------------------------------

            createUser(

                name.trim(),

                email.trim().toLowerCase(),

                passwordHash

            );


            // -----------------------------------------
            // EXCEL ACTIVITY
            // -----------------------------------------

            saveActivity(

                name.trim(),

                email.trim().toLowerCase(),

                "REGISTER"

            );


            return res.status(201).json({

                success: true,

                message:
                    "Account created successfully.",

                user: {

                    name:
                        name.trim(),

                    email:
                        email.trim().toLowerCase()

                }

            });

        }

        catch (error) {

            console.error(
                "REGISTER ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to create account."

            });

        }

    }
);


// =====================================================
// LOGIN API
// =====================================================

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


            // -----------------------------------------
            // VALIDATION
            // -----------------------------------------

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


            // -----------------------------------------
            // FIND USER
            // -----------------------------------------

            const user =
                findUserByEmail(
                    email.trim()
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            // -----------------------------------------
            // COMPARE PASSWORD
            // -----------------------------------------

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


            // -----------------------------------------
            // SAVE LOGIN ACTIVITY
            // -----------------------------------------

            saveActivity(

                user.name,

                user.email,

                "LOGIN"

            );


            // -----------------------------------------
            // SUCCESS
            // -----------------------------------------

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

        }

        catch (error) {

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


// =====================================================
// 404 HANDLER
// =====================================================

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "API endpoint not found."

        });

    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            `Priyanshu Secure Portal API running on port ${PORT}`
        );

    }
);
