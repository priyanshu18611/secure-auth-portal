const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 5000;

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());


// ===============================
// DATA DIRECTORY
// ===============================

const dataDir = path.join(__dirname, "../data");

const excelFile = path.join(
    dataDir,
    "users.xlsx"
);


// ===============================
// CREATE DATA FOLDER
// ===============================

if (!fs.existsSync(dataDir)) {

    fs.mkdirSync(
        dataDir,
        {
            recursive: true
        }
    );

}


// ===============================
// CREATE EXCEL FILE
// ===============================

function createExcelFile() {

    if (fs.existsSync(excelFile)) {
        return;
    }

    const headers = [
        {
            ID: 1,
            Name: "",
            Email: "",
            Action: "",
            Date: "",
            Time: ""
        }
    ];

    const worksheet =
        XLSX.utils.json_to_sheet(headers);

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Users"
    );

    XLSX.writeFile(
        workbook,
        excelFile
    );
}

createExcelFile();


// ===============================
// WRITE USER TO EXCEL
// ===============================

function saveToExcel(
    name,
    email,
    action
) {

    const workbook =
        XLSX.readFile(excelFile);

    const worksheet =
        workbook.Sheets["Users"];

    const data =
        XLSX.utils.sheet_to_json(
            worksheet
        );

    const nextId =
        data.length + 1;

    const now =
        new Date();

    const date =
        now.toLocaleDateString("en-IN");

    const time =
        now.toLocaleTimeString("en-IN");


    data.push({

        ID: nextId,

        Name: name,

        Email: email,

        Action: action,

        Date: date,

        Time: time

    });


    const newWorksheet =
        XLSX.utils.json_to_sheet(
            data
        );


    workbook.Sheets["Users"] =
        newWorksheet;


    XLSX.writeFile(
        workbook,
        excelFile
    );

}


// ===============================
// HEALTH CHECK
// ===============================

app.get(
    "/",
    (req, res) => {

        res.json({

            status: "online",

            message:
                "Priyanshu Secure Portal API is running."

        });

    }
);


// ===============================
// REGISTER
// ===============================

app.post(
    "/api/register",
    async (req, res) => {

        try {

            const {
                name,
                email,
                password
            } = req.body;


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


            if (password.length < 6) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must contain at least 6 characters."

                });

            }


            const workbook =
                XLSX.readFile(excelFile);

            const worksheet =
                workbook.Sheets["Users"];

            const users =
                XLSX.utils.sheet_to_json(
                    worksheet
                );


            const existingUser =
                users.find(
                    user =>
                        user.Email &&
                        user.Email.toLowerCase() ===
                        email.toLowerCase()
                );


            if (existingUser) {

                return res.status(409).json({

                    success: false,

                    message:
                        "An account with this email already exists."

                });

            }


            // Password is hashed.
            // It is NOT stored in Excel.

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            // Future database storage
            // will use passwordHash.


            saveToExcel(
                name,
                email,
                "REGISTER"
            );


            return res.status(201).json({

                success: true,

                message:
                    "Account created successfully.",

                user: {

                    name,
                    email

                }

            });

        }

        catch (error) {

            console.error(
                "Registration error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Server error."

            });

        }

    }
);


// ===============================
// LOGIN
// ===============================

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


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


            const workbook =
                XLSX.readFile(excelFile);

            const worksheet =
                workbook.Sheets["Users"];

            const users =
                XLSX.utils.sheet_to_json(
                    worksheet
                );


            const user =
                users.find(
                    item =>
                        item.Email &&
                        item.Email.toLowerCase() ===
                        email.toLowerCase()
                );


            /*
             * IMPORTANT:
             *
             * Excel currently stores
             * registration/login records,
             * not password hashes.
             *
             * A proper production database
             * will be connected in the next
             * backend step.
             */


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            saveToExcel(
                user.Name || "",
                user.Email,
                "LOGIN"
            );


            return res.json({

                success: true,

                message:
                    "Login recorded successfully.",

                user: {

                    name:
                        user.Name || "",

                    email:
                        user.Email

                }

            });

        }

        catch (error) {

            console.error(
                "Login error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Server error."

            });

        }

    }
);


// ===============================
// SERVER
// ===============================

app.listen(
    PORT,
    () => {

        console.log(
            `Priyanshu Secure Portal running on port ${PORT}`
        );

    }
);
