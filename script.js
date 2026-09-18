"use strict";

/* =========================================================
   PRIYANSHU SECURE PORTAL
   AUTHENTICATION FRONTEND
   ========================================================= */

const API_URL = "https://priyanshu-secure-auth.onrender.com";

const TOKEN_KEY = "priynashu_access_token";
const USER_KEY = "priynashu_user";
const REMEMBER_EMAIL_KEY = "priynashu_remember_email";

/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =========================================================
   TOAST / MESSAGE
   ========================================================= */

function showMessage(title, message, type = "error") {
    console.log(`[${type}] ${title}: ${message}`);

    const toast = $("toast");

    if (!toast) {
        alert(`${title}\n\n${message}`);
        return;
    }

    const titleElement = $("toastTitle");
    const messageElement = $("toastMessage");

    if (titleElement) {
        titleElement.textContent = title;
    }

    if (messageElement) {
        messageElement.textContent = message;
    }

    toast.dataset.type = type;

    toast.classList.add("show");
    toast.classList.add("active");

    clearTimeout(window.__toastTimer);

    window.__toastTimer = setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.remove("active");
    }, 4500);
}

/* =========================================================
   API REQUEST
   ========================================================= */

async function apiRequest(endpoint, options = {}) {

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 40000);

    try {

        const response = await fetch(
            API_URL + endpoint,
            {
                method: options.method || "GET",

                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                },

                body: options.body,

                signal: controller.signal
            }
        );

        const text = await response.text();

        let data;

        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = {
                success: false,
                message: text || "Invalid server response."
            };
        }

        return {
            ok: response.ok,
            status: response.status,
            data: data
        };

    } catch (error) {

        console.error("API ERROR:", error);

        if (error.name === "AbortError") {
            throw new Error(
                "Server is taking too long to respond. Render may be waking up. Please try again."
            );
        }

        throw new Error(
            "Unable to connect to the secure authentication server."
        );

    } finally {
        clearTimeout(timeout);
    }
}

/* =========================================================
   SESSION
   ========================================================= */

function saveSession(token, user) {

    if (!token) {
        throw new Error("Authentication token was not received.");
    }

    sessionStorage.setItem(
        TOKEN_KEY,
        token
    );

    sessionStorage.setItem(
        USER_KEY,
        JSON.stringify(user || {})
    );
}

function clearSession() {

    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
}

/* =========================================================
   REMEMBER EMAIL
   ========================================================= */

function loadRememberedEmail() {

    const emailInput = $("email");
    const remember = $("remember");

    if (!emailInput) return;

    try {

        const savedEmail =
            localStorage.getItem(
                REMEMBER_EMAIL_KEY
            );

        if (savedEmail) {

            emailInput.value = savedEmail;

            if (remember) {
                remember.checked = true;
            }
        }

    } catch (error) {
        console.warn("Remember email unavailable.");
    }
}

function saveRememberedEmail(email) {

    const remember = $("remember");

    try {

        if (remember && remember.checked) {

            localStorage.setItem(
                REMEMBER_EMAIL_KEY,
                email
            );

        } else {

            localStorage.removeItem(
                REMEMBER_EMAIL_KEY
            );
        }

    } catch (error) {
        console.warn("Unable to save remembered email.");
    }
}

/* =========================================================
   LOGIN BUTTON
   ========================================================= */

function setLoginLoading(loading) {

    const button = $("loginBtn");

    if (!button) return;

    button.disabled = loading;

    if (loading) {

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            "Signing In...";

    } else {

        button.textContent =
            button.dataset.originalText ||
            "Sign In";
    }
}

/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser(event) {

    if (event) {
        event.preventDefault();
    }

    const emailInput = $("email");
    const passwordInput = $("password");

    if (!emailInput || !passwordInput) {

        console.error(
            "Login fields not found."
        );

        return;
    }

    const email =
        normalizeEmail(
            emailInput.value
        );

    const password =
        passwordInput.value;

    /* ---------- VALIDATION ---------- */

    if (!email) {

        showMessage(
            "Email Required",
            "Please enter your email address."
        );

        emailInput.focus();

        return;
    }

    if (!validEmail(email)) {

        showMessage(
            "Invalid Email",
            "Please enter a valid email address."
        );

        emailInput.focus();

        return;
    }

    if (!password) {

        showMessage(
            "Password Required",
            "Please enter your password."
        );

        passwordInput.focus();

        return;
    }

    /* ---------- LOADING ---------- */

    setLoginLoading(true);

    try {

        console.log(
            "🔐 Sending login request..."
        );

        const result =
            await apiRequest(
                "/api/login",
                {
                    method: "POST",

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

        console.log(
            "Login response:",
            result.status,
            result.data
        );

        /* ---------- SERVER ERROR ---------- */

        if (!result.ok) {

            const message =
                result.data &&
                result.data.message
                    ? result.data.message
                    : "Login failed.";

            throw new Error(message);
        }

        /* ---------- SUCCESS CHECK ---------- */

        if (!result.data.success) {

            throw new Error(
                result.data.message ||
                "Invalid email or password."
            );
        }

        /* ---------- TOKEN CHECK ---------- */

        if (!result.data.token) {

            throw new Error(
                "Login succeeded but authentication token was not received."
            );
        }

        /* ---------- SAVE SESSION ---------- */

        saveSession(
            result.data.token,
            result.data.user
        );

        saveRememberedEmail(email);

        /* ---------- SUCCESS ---------- */

        showMessage(
            "Login Successful",
            "Authentication verified. Opening your dashboard...",
            "success"
        );

        console.log(
            "✅ Login successful."
        );

        /* ---------- REDIRECT ---------- */

        setTimeout(() => {

            window.location.href =
                "dashboard.html";

        }, 700);

    } catch (error) {

        console.error(
            "❌ LOGIN FAILED:",
            error
        );

        showMessage(
            "Login Failed",
            error.message ||
            "Unable to sign in. Please try again.",
            "error"
        );

    } finally {

        setLoginLoading(false);
    }
}

/* =========================================================
   REGISTER
   ========================================================= */

async function registerUser(event) {

    if (event) {
        event.preventDefault();
    }

    const nameInput =
        $("registerName") ||
        $("name");

    const emailInput =
        $("registerEmail") ||
        $("regEmail");

    const passwordInput =
        $("registerPassword") ||
        $("regPassword");

    const confirmInput =
        $("confirmPassword") ||
        $("confirmPasswordInput");

    const terms =
        $("acceptTerms") ||
        $("terms");

    if (
        !nameInput ||
        !emailInput ||
        !passwordInput
    ) {

        console.error(
            "Registration fields not found."
        );

        return;
    }

    const name =
        String(nameInput.value || "")
            .trim();

    const email =
        normalizeEmail(
            emailInput.value
        );

    const password =
        passwordInput.value;

    const confirm =
        confirmInput
            ? confirmInput.value
            : password;

    if (name.length < 2) {

        showMessage(
            "Name Required",
            "Please enter your full name."
        );

        nameInput.focus();

        return;
    }

    if (!validEmail(email)) {

        showMessage(
            "Invalid Email",
            "Please enter a valid email address."
        );

        emailInput.focus();

        return;
    }

    if (password.length < 6) {

        showMessage(
            "Weak Password",
            "Password must contain at least 6 characters."
        );

        passwordInput.focus();

        return;
    }

    if (password !== confirm) {

        showMessage(
            "Password Mismatch",
            "Both passwords must match."
        );

        confirmInput?.focus();

        return;
    }

    if (terms && !terms.checked) {

        showMessage(
            "Terms Required",
            "Please accept the Terms & Privacy Policy."
        );

        return;
    }

    const button =
        $("registerBtn");

    if (button) {
        button.disabled = true;
        button.textContent =
            "Creating Account...";
    }

    try {

        const result =
            await apiRequest(
                "/api/register",
                {
                    method: "POST",

                    body: JSON.stringify({
                        name: name,
                        email: email,
                        password: password
                    })
                }
            );

        if (!result.ok) {

            throw new Error(
                result.data.message ||
                "Unable to create account."
            );
        }

        if (!result.data.success) {

            throw new Error(
                result.data.message ||
                "Registration failed."
            );
        }

        showMessage(
            "Account Created",
            "Your account has been created successfully. Please sign in.",
            "success"
        );

        /* Put email into login form */

        const loginEmail =
            $("email");

        if (loginEmail) {
            loginEmail.value = email;
        }

        /* Clear registration */

        if (nameInput) {
            nameInput.value = "";
        }

        if (passwordInput) {
            passwordInput.value = "";
        }

        if (confirmInput) {
            confirmInput.value = "";
        }

        /* Close modal if present */

        setTimeout(() => {

            closeRegisterModal();

            if (loginEmail) {
                loginEmail.focus();
            }

        }, 800);

    } catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );

        showMessage(
            "Registration Failed",
            error.message ||
            "Unable to create account."
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent =
                "Create Secure Account";
        }
    }
}

/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

async function forgotPasswordHandler(event) {

    if (event) {
        event.preventDefault();
    }

    const emailInput =
        $("email");

    if (!emailInput) return;

    const email =
        normalizeEmail(
            emailInput.value
        );

    if (!validEmail(email)) {

        showMessage(
            "Email Required",
            "Enter your account email first."
        );

        emailInput.focus();

        return;
    }

    try {

        showMessage(
            "Please Wait",
            "Sending password reset request...",
            "success"
        );

        const result =
            await apiRequest(
                "/api/forgot-password",
                {
                    method: "POST",

                    body: JSON.stringify({
                        email: email
                    })
                }
            );

        if (!result.ok) {

            throw new Error(
                result.data.message ||
                "Unable to process reset request."
            );
        }

        showMessage(
            "Check Your Email",
            result.data.message ||
            "If the account exists, password reset instructions have been sent.",
            "success"
        );

    } catch (error) {

        console.error(
            "FORGOT PASSWORD ERROR:",
            error
        );

        showMessage(
            "Reset Failed",
            error.message ||
            "Unable to process password reset."
        );
    }
}

/* =========================================================
   PASSWORD VISIBILITY
   ========================================================= */

function togglePassword(inputId, buttonId) {

    const input =
        $(inputId);

    const button =
        $(buttonId);

    if (!input) return;

    if (input.type === "password") {

        input.type = "text";

        if (button) {
            button.textContent = "🙈";
        }

    } else {

        input.type = "password";

        if (button) {
            button.textContent = "👁";
        }
    }
}

/* =========================================================
   REGISTER MODAL
   ========================================================= */

function openRegisterModal() {

    const modal =
        $("registerModal");

    if (!modal) return;

    modal.classList.add("active");
    modal.classList.add("show");

    document.body.classList.add(
        "modal-open"
    );
}

function closeRegisterModal() {

    const modal =
        $("registerModal");

    if (!modal) return;

    modal.classList.remove("active");
    modal.classList.remove("show");

    document.body.classList.remove(
        "modal-open"
    );
}

/* =========================================================
   SOCIAL LOGIN
   ========================================================= */

function socialLogin(provider) {

    showMessage(
        `${provider} Login`,
        `${provider} OAuth is not connected yet. Please use email and password.`,
        "error"
    );
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeSecurePortal() {

    console.log(
        "🔐 Priyanshu Secure Portal initialized."
    );

    console.log(
        "🌐 API:",
        API_URL
    );

    /* ---------- Remember email ---------- */

    loadRememberedEmail();

    /* ---------- Login ---------- */

    const loginForm =
        $("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            loginUser
        );

    }

    /* ---------- Register ---------- */

    const registerForm =
        $("registerForm");

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            registerUser
        );

    }

    /* ---------- Register link ---------- */

    const registerLink =
        $("registerLink");

    if (registerLink) {

        registerLink.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                openRegisterModal();
            }
        );
    }

    /* ---------- Close register ---------- */

    const registerClose =
        $("registerClose");

    if (registerClose) {

        registerClose.addEventListener(
            "click",
            closeRegisterModal
        );
    }

    const backToLogin =
        $("backToLogin");

    if (backToLogin) {

        backToLogin.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                closeRegisterModal();
            }
        );
    }

    /* ---------- Forgot password ---------- */

    const forgotPassword =
        $("forgotPassword");

    if (forgotPassword) {

        forgotPassword.addEventListener(
            "click",
            forgotPasswordHandler
        );
    }

    /* ---------- Password toggle ---------- */

    const togglePasswordButton =
        $("togglePassword");

    if (togglePasswordButton) {

        togglePasswordButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                togglePassword(
                    "password",
                    "togglePassword"
                );
            }
        );
    }

    const toggleRegisterButton =
        $("toggleRegisterPassword");

    if (toggleRegisterButton) {

        toggleRegisterButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                togglePassword(
                    "registerPassword",
                    "toggleRegisterPassword"
                );
            }
        );
    }

    const toggleConfirmButton =
        $("toggleConfirmPassword");

    if (toggleConfirmButton) {

        toggleConfirmButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                togglePassword(
                    "confirmPassword",
                    "toggleConfirmPassword"
                );
            }
        );
    }

    /* ---------- Google ---------- */

    const google =
        $("googleLogin");

    if (google) {

        google.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                socialLogin("Google");
            }
        );
    }

    /* ---------- GitHub ---------- */

    const github =
        $("githubLogin");

    if (github) {

        github.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                socialLogin("GitHub");
            }
        );
    }

    /* ---------- Escape closes modal ---------- */

    document.addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Escape") {
                closeRegisterModal();
            }
        }
    );
}

/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeSecurePortal
    );

} else {

    initializeSecurePortal();
}
