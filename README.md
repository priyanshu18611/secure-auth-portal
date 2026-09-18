# 🔐 PRIYANSHU SECURE AUTH PORTAL

<p align="center">
  <img src="https://img.shields.io/badge/PRIYANSHU-SECURE%20PORTAL-7C3AED?style=for-the-badge" alt="Priyanshu Secure Portal">
  <img src="https://img.shields.io/badge/Student%20Developer-Learning%20Hub-06B6D4?style=for-the-badge" alt="Student Developer">
</p>

<p align="center">
  <b>A premium full-stack authentication + learning platform built for students and developers.</b>
</p>

<p align="center">
  Secure authentication • PostgreSQL • Password reset • Developer courses • Practical labs • Quizzes • Interview practice • XP • Certificates
</p>

---

## 🌐 Live Project

### 🚀 Frontend
**GitHub Pages:**  
https://priyanshu18611.github.io/secure-auth-portal/

### ⚙️ Backend API
**Render:**  
https://priyanshu-secure-auth.onrender.com

### 🧑‍💻 Developer
**Priyanshu Kumar**

---

# ✨ What is Secure Auth Portal?

**Priyanshu Secure Auth Portal** is a full-stack student/developer platform that combines a secure authentication system with an interactive learning hub.

Instead of being only a login page or a collection of static study notes, the project is designed around a complete learning workflow:

> **Learn → Practice → Quiz → Interview → Track Progress → Earn XP → Complete Course → Generate Certificate**

The platform contains programming courses, DSA, DBMS & SQL, web development, AI/ML, analytics, cloud, cybersecurity and placement/interview preparation.

---

# 🚀 Core Features

## 🔐 Authentication System

- Secure user registration
- Login with email/password
- Password hashing with `bcryptjs`
- JWT-based authentication
- Protected dashboard
- Authenticated `/api/me` endpoint
- Logout/session handling
- Forgot password flow
- Password reset token system
- Token expiry and one-time reset usage
- Rate limiting for authentication endpoints
- Helmet security headers
- CORS protection
- Request validation

> Passwords are never stored in Excel. Password hashes are stored in PostgreSQL.

---

# 📚 Developer Learning Hub

The dashboard includes a complete study ecosystem covering:

### 💻 Programming

- C
- C++
- Java
- Python
- JavaScript
- HTML5
- CSS

### 🧠 Computer Science

- Data Structures & Algorithms
- DBMS
- SQL & MySQL
- OOP
- Operating Systems
- Computer Networks
- Software Engineering

### 🌐 Development

- React
- Node.js & Express
- REST APIs
- MongoDB
- Git & GitHub

### 🤖 AI & Data

- AI & Machine Learning
- Deep Learning concepts
- Data Analytics
- Pandas
- NumPy
- Power BI
- Excel

### ☁️ Advanced

- Cloud & DevOps
- Cybersecurity
- IoT
- Placement Preparation
- Interview Preparation

---

# 🧪 Practical Lab System

Learning is not limited to reading concepts.

Each module can contain practical tasks with:

- Task instructions
- Coding workspace
- Hints
- Expected approach
- Solution guidance
- Task completion tracking
- XP rewards
- Progress persistence

### Learning flow

```text
Concept
   ↓
Example
   ↓
Practical Lab
   ↓
Task Completion
   ↓
Quiz
   ↓
Interview Practice
   ↓
Module Completion
```

---

# 🎤 Interview Practice

The platform includes interview-oriented learning for each course.

Users can:

- View interview questions
- Reveal model answers
- Review key points
- Practice follow-up questions
- Mark questions as known
- Mark questions for revision
- Track interview preparation progress

This helps convert theoretical knowledge into interview-ready answers.

---

# 🧠 Quiz Engine

Each learning module can include quizzes with:

- Multiple-choice questions
- Instant feedback
- Correct/incorrect state
- Explanations
- Score tracking
- Progress persistence
- XP rewards

The goal is to make every module measurable instead of simply marking it as "read".

---

# ⚡ XP, Levels & Streaks

The learning experience includes a lightweight gamification system.

### ⚡ XP

Earn XP through activities such as:

- Completing modules
- Completing practical tasks
- Completing quizzes
- Interview practice

### 🔥 Streak

Study activity can be tracked to encourage consistent learning.

### 🏅 Levels

Accumulated XP contributes to the learner's level.

Example:

```text
Level 01 → Beginner
Level 02 → Explorer
Level 03 → Learner
Level 04 → Builder
Level 05 → Developer
Level 06 → Advanced
Level 07 → Problem Solver
Level 08 → Pro Developer
```

---

# 📝 Personal Notes

Every course/module can have personal notes.

Users can:

- Write notes
- Edit notes
- Save notes
- Revisit notes while studying

Notes are stored locally in the browser for the current frontend implementation.

---

# 🃏 Flashcards

The learning interface includes flashcard-style active recall.

Use flashcards to:

1. Read a question
2. Think about the answer
3. Reveal the answer
4. Decide whether the concept needs revision

This is designed around active recall rather than passive reading.

---

# ⏱️ Focus Mode

A built-in focus timer can be used for study sessions.

Example:

```text
25 MIN FOCUS
      ↓
Study
      ↓
Complete Mission
      ↓
Track Progress
```

---

# 🎯 Daily Mission

The platform can present daily learning goals such as:

```text
TODAY'S MISSION

☑ Complete one lesson
☐ Finish 3 practical tasks
☐ Answer 5 quiz questions
☐ Practice 2 interview questions
```

---

# 🏆 Certificates

Course completion can unlock a personalized certificate.

Certificate information can include:

- Learner name
- Course name
- Completion percentage
- Completion date
- Unique certificate ID
- Academy branding

Example:

```text
PRIYANSHU DEVELOPER ACADEMY

CERTIFICATE OF COMPLETION

This certificate is presented to

PRIYANSHU KUMAR

for successfully completing

PYTHON PROGRAMMING

Completion: 100%
Certificate ID: PK-PY-XXXXXX
```

The certificate can be printed or saved as PDF through the browser's print dialog.

---

# 🗺️ Course Structure

The course system follows a module-based structure.

Example — Python:

```text
01. Python Fundamentals
02. Operators & Input
03. Conditions
04. Loops
05. Functions
06. Collections
07. Strings
08. Object-Oriented Programming
09. Files & Exceptions
10. Modules & Libraries
11. Python Project
```

The same learning architecture is used across multiple technology tracks.

---

# 📊 Progress Tracking

Course progress is tracked module-by-module.

The learning UI can show:

```text
Course Progress
━━━━━━━━━━━━━━━━━━
████████████░░░░ 75%

Modules      8 / 11
Labs         31
Quiz Score   84%
Interview    18
XP           1,250
```

Progress data is persisted in the browser for the current frontend implementation.

---

# 🛠️ Technology Stack

## Frontend

- HTML5
- CSS3
- JavaScript
- Responsive UI
- LocalStorage
- SessionStorage

## Backend

- Node.js
- Express.js
- JWT
- bcryptjs
- Helmet
- CORS
- Express Rate Limit

## Database

- PostgreSQL
- `pg` Node.js driver

## Reporting

- XLSX
- PostgreSQL activity logs
- Excel activity report for local/runtime reporting

## Deployment

- GitHub Pages — Frontend
- Render — Backend
- Render PostgreSQL — Database

---

# 🏗️ Project Architecture

```text
                     ┌─────────────────────────┐
                     │       USER / BROWSER    │
                     └────────────┬────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │     GitHub Pages        │
                    │                         │
                    │ index.html              │
                    │ dashboard.html          │
                    │ course.html             │
                    │ reset-password.html     │
                    │ style.css               │
                    │ script.js               │
                    └────────────┬────────────┘
                                 │ HTTPS API
                                 ▼
                    ┌─────────────────────────┐
                    │     Express Backend     │
                    │                         │
                    │ Authentication          │
                    │ JWT                     │
                    │ Password Reset          │
                    │ Validation              │
                    │ Rate Limiting           │
                    │ Activity Logging        │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      PostgreSQL         │
                    │                         │
                    │ users                   │
                    │ password_reset_tokens   │
                    │ activity_logs           │
                    └─────────────────────────┘
```

---

# 📁 Project Structure

```text
secure-auth-portal/
│
├── index.html
├── dashboard.html
├── course.html
├── reset-password.html
├── style.css
├── script.js
│
├── backend/
│   ├── server.js
│   ├── database.js
│   └── package.json
│
├── data/
│   └── .gitkeep
│
└── .gitignore
```

---

# 🔑 Environment Variables

The backend uses environment variables for sensitive configuration.

Example:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_long_random_secret
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_verified_sender
FRONTEND_URL=https://priyanshu18611.github.io/secure-auth-portal
PORT=10000
```

### ⚠️ Security

Never commit:

```text
.env
.env.*
database passwords
JWT secrets
API keys
private credentials
```

The `.gitignore` file is configured to keep environment secrets and generated activity reports out of Git.

---

# 🧑‍💻 Local Development

## 1. Clone

```bash
git clone https://github.com/priyanshu18611/secure-auth-portal.git
cd secure-auth-portal
```

## 2. Install backend dependencies

```bash
cd backend
npm install
```

## 3. Configure environment variables

Create a `.env` file for local development and provide your PostgreSQL and authentication configuration.

## 4. Start backend

```bash
npm start
```

The API will run on the configured port.

## 5. Open frontend

Open:

```text
index.html
```

or serve the project through a local static server.

---

# ❤️ Social & Developer Links

| Platform | Profile |
|---|---|
| Instagram | https://www.instagram.com/thepriyanshuroy.ofc/ |
| Facebook | https://www.facebook.com/share/1GmyKmd8PL/ |
| LinkedIn | https://linkedin.com/in/priyanshuroy18 |
| GitHub | https://github.com/priyanshu18611 |
| Portfolio | https://priyanshu18611.github.io/portfolio/ |

---

# 👨‍💻 About the Developer

## Priyanshu Kumar

**B.Tech — Computer Science & Engineering**

Interested in:

- Software Engineering
- Python Development
- Data Analytics
- Machine Learning
- Full-Stack Development
- Cybersecurity
- Cloud & DevOps
- IoT

This project combines those interests into one practical platform.

---

# 🔮 Future Roadmap

Planned improvements include:

- [ ] PostgreSQL-based learning progress sync
- [ ] User-specific course history
- [ ] Advanced coding playground
- [ ] Python/C/C++/Java code execution through a secure sandbox
- [ ] Weak-topic detection
- [ ] Spaced-repetition revision system
- [ ] More interactive coding challenges
- [ ] Project submission workflow
- [ ] Advanced analytics dashboard
- [ ] More course content
- [ ] Certificate verification page
- [ ] Achievement/badge system
- [ ] PWA/mobile experience
- [ ] Admin course management
- [ ] Secure OAuth integration

---

# 🔐 Security Notes

This project follows several security practices:

- Password hashing with bcrypt
- JWT authentication
- HTTP security headers
- CORS restrictions
- Rate limiting
- Input validation
- Password reset token hashing
- Expiring password reset tokens
- One-time password reset tokens
- PostgreSQL persistence
- Secrets kept in environment variables

### Important

The current frontend authentication token is kept in `sessionStorage`. For a higher-security production architecture, the authentication flow should be migrated to secure **HttpOnly + Secure + SameSite cookies** with an appropriate refresh-token strategy.

---

# ⚡ Project Philosophy

```text
Don't just WATCH a course.
        ↓
UNDERSTAND it.
        ↓
PRACTICE it.
        ↓
BREAK things.
        ↓
DEBUG them.
        ↓
PASS the quiz.
        ↓
ANSWER the interview question.
        ↓
BUILD a project.
        ↓
EARN the certificate.
```

---

# ⭐ Why This Project?

Most student portals separate:

```text
Courses
Notes
Practice
Interviews
Projects
Certificates
```

This project brings them into one workflow:

```text
                    ┌─────────────┐
                    │   LEARN     │
                    └──────┬──────┘
                           ↓
                    ┌─────────────┐
                    │  PRACTICE   │
                    └──────┬──────┘
                           ↓
                    ┌─────────────┐
                    │    QUIZ     │
                    └──────┬──────┘
                           ↓
                    ┌─────────────┐
                    │  INTERVIEW  │
                    └──────┬──────┘
                           ↓
                    ┌─────────────┐
                    │   PROJECT   │
                    └──────┬──────┘
                           ↓
                    ┌─────────────┐
                    │ CERTIFICATE │
                    └─────────────┘
```

---

# 📜 License

This project is created and maintained by **Priyanshu Kumar**.

If you use the architecture or learning ideas from this project, please provide appropriate credit.

---

<p align="center">
  <b>Built with ❤️, JavaScript, Node.js, Express & PostgreSQL by Priyanshu Kumar</b>
</p>

<p align="center">
  ⭐ If you find this project useful, consider starring the repository.
</p>
