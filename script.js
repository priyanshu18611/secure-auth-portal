// ============================================================
// PRIYANSHU SECURE PORTAL
// Frontend Authentication Controller
// Version 3.0.0
// ============================================================

"use strict";


// ============================================================
// CONFIGURATION
// ============================================================

const API_URL =
    "https://priyanshu-secure-auth.onrender.com";

const TOKEN_KEY =
    "priynashu_access_token";

const USER_KEY =
    "priynashu_user";

const REMEMBER_EMAIL_KEY =
    "priynashu_remember_email";


// ============================================================
// DOM HELPERS
// ============================================================

const $ = (id) =>
    document.getElementById(id);


// ============================================================
// ELEMENTS
// ============================================================

const loginForm =
    $("loginForm");

const loginBtn =
    $("loginBtn");

const emailInput =
    $("email");

const passwordInput =
    $("password");

const rememberInput =
    $("remember");

const togglePassword =
    $("togglePassword");

const forgotPassword =
    $("forgotPassword");

const googleLogin =
    $("googleLogin");

const githubLogin =
    $("githubLogin");

const registerLink =
    $("registerLink");

const registerModal =
    $("registerModal");

const closeRegister =
    $("closeRegister");

const registerForm =
    $("registerForm");

const registerBtn =
    $("registerBtn");

const registerName =
    $("registerName");

const registerEmail =
    $("registerEmail");

const registerPassword =
    $("registerPassword");

const registerConfirmPassword =
    $("registerConfirmPassword");

const registerTerms =
    $("registerTerms");

const toast =
    $("toast");

const toastTitle =
    $("toastTitle");

const toastMessage =
    $("toastMessage");

const toastClose =
    $("toastClose");


// ============================================================
// API REQUEST HELPER
// ============================================================

async function apiRequest(
    endpoint,
    options = {}
) {

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => {
                controller.abort();
            },
            30000
        );

    try {

        const response =
            await fetch(
                `${API_URL}${endpoint}`,
                {
                    ...options,

                    headers: {
                        "Content-Type":
                            "application/json",

                        ...(options.headers || {})
                    },

                    signal:
                        controller.signal
                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch (error) {

            data = {
                success: false,
                message:
                    "Invalid server response."
            };

        }


        return {
            response,
            data
        };

    } catch (error) {

        if (
            error.name ===
            "AbortError"
        ) {

            throw new Error(
                "Server took too long to respond. Please try again."
            );

        }

        throw new Error(
            "Unable to connect to the authentication server."
        );

    } finally {

        clearTimeout(timeout);

    }

}


// ============================================================
// TOAST
// ============================================================

let toastTimer = null;


function showToast(
    message,
    type = "info",
    title = null
) {

    if (!toast) {

        alert(message);

        return;

    }


    if (toastTimer) {

        clearTimeout(
            toastTimer
        );

    }


    if (toastTitle) {

        toastTitle.textContent =
            title ||
            (
                type === "success"
                    ? "Success"
                    : type === "error"
                        ? "Error"
                        : "Notice"
            );

    }


    if (toastMessage) {

        toastMessage.textContent =
            message;

    }


    const icon =
        toast.querySelector(
            ".toast-icon"
        );


    if (icon) {

        icon.textContent =
            type === "success"
                ? "✓"
                : type === "error"
                    ? "!"
                    : "i";

    }


    toast.classList.add(
        "show"
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            4500
        );

}


// ============================================================
// CLOSE TOAST
// ============================================================

function hideToast() {

    if (!toast) {
        return;
    }

    toast.classList.remove(
        "show"
    );

}


if (toastClose) {

    toastClose.addEventListener(
        "click",
        hideToast
    );

}


// ============================================================
// BUTTON LOADING STATE
// ============================================================

function setButtonLoading(
    button,
    loading,
    loadingText = "Please wait..."
) {

    if (!button) {
        return;
    }


    const text =
        button.querySelector(
            ".button-text"
        );


    button.disabled =
        loading;


    button.classList.toggle(
        "loading",
        loading
    );


    if (text) {

        if (loading) {

            button.dataset.originalText =
                text.textContent;

            text.textContent =
                loadingText;

        } else {

            text.textContent =
                button.dataset.originalText ||
                text.textContent;

        }

    }

}


// ============================================================
// EMAIL VALIDATION
// ============================================================

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


// ============================================================
// PASSWORD VISIBILITY
// ============================================================

if (togglePassword) {

    togglePassword.addEventListener(
        "click",
        () => {

            if (!passwordInput) {
                return;
            }


            const isPassword =
                passwordInput.type ===
                "password";


            passwordInput.type =
                isPassword
                    ? "text"
                    : "password";


            togglePassword.classList.toggle(
                "password-visible",
                isPassword
            );


            togglePassword.setAttribute(
                "aria-label",
                isPassword
                    ? "Hide password"
                    : "Show password"
            );

        }
    );

}


// ============================================================
// REMEMBERED EMAIL
// ============================================================

function loadRememberedEmail() {

    try {

        const rememberedEmail =
            localStorage.getItem(
                REMEMBER_EMAIL_KEY
            );


        if (
            rememberedEmail &&
            emailInput
        ) {

            emailInput.value =
                rememberedEmail;

        }

    } catch (error) {

        console.warn(
            "Could not load remembered email."
        );

    }

}


function saveRememberedEmail(
    email
) {

    try {

        if (
            rememberInput &&
            rememberInput.checked
        ) {

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

        console.warn(
            "Could not save remembered email."
        );

    }

}


// ============================================================
// LOGIN
// ============================================================

async function loginUser() {

    if (
        !emailInput ||
        !passwordInput
    ) {

        return;

    }


    const email =
        emailInput.value
            .trim()
            .toLowerCase();

    const password =
        passwordInput.value;


    // --------------------------------------------------------
    // Frontend validation
    // --------------------------------------------------------

    if (!isValidEmail(email)) {

        showToast(
            "Please enter a valid email address.",
            "error",
            "Invalid email"
        );

        emailInput.focus();

        return;

    }


    if (
        !password ||
        password.length === 0
    ) {

        showToast(
            "Please enter your password.",
            "error",
            "Password required"
        );

        passwordInput.focus();

        return;

    }


    if (
        password.length > 128
    ) {

        showToast(
            "Password is too long.",
            "error",
            "Invalid password"
        );

        return;

    }


    setButtonLoading(
        loginBtn,
        true,
        "Signing in..."
    );


    try {

        const {
            response,
            data
        } =
            await apiRequest(
                "/api/login",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            email,
                            password
                        })
                }
            );


        if (
            !response.ok ||
            !data.success
        ) {

            showToast(
                data.message ||
                "Login failed. Please check your credentials.",
                "error",
                "Sign in failed"
            );

            return;

        }


        // ----------------------------------------------------
        // Save authentication data
        // ----------------------------------------------------

        if (
            !data.token
        ) {

            showToast(
                "The server did not return an authentication token.",
                "error",
                "Authentication error"
            );

            return;

        }


        sessionStorage.setItem(
            TOKEN_KEY,
            data.token
        );


        if (data.user) {

            sessionStorage.setItem(
                USER_KEY,
                JSON.stringify(
                    data.user
                )
            );

        }


        saveRememberedEmail(
            email
        );


        showToast(
            "Login successful. Opening your dashboard...",
            "success",
            "Welcome back"
        );


        // ----------------------------------------------------
        // Dashboard redirect
        // ----------------------------------------------------

        setTimeout(
            () => {

                window.location.href =
                    "dashboard.html";

            },
            700
        );


    } catch (error) {

        console.error(
            "LOGIN REQUEST ERROR:",
            error
        );


        showToast(
            error.message ||
            "Unable to connect to the server.",
            "error",
            "Connection error"
        );

    } finally {

        setButtonLoading(
            loginBtn,
            false
        );

    }

}


// ============================================================
// LOGIN FORM SUBMIT
// ============================================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            await loginUser();

        }
    );

}


// ============================================================
// REGISTER MODAL
// ============================================================

function openRegisterModal() {

    if (!registerModal) {
        return;
    }


    registerModal.classList.add(
        "show"
    );


    registerModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    setTimeout(
        () => {

            if (registerName) {

                registerName.focus();

            }

        },
        250
    );

}


function closeRegisterModal() {

    if (!registerModal) {
        return;
    }


    registerModal.classList.remove(
        "show"
    );


    registerModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";


    if (registerForm) {

        registerForm.reset();

    }

}


if (registerLink) {

    registerLink.addEventListener(
        "click",
        openRegisterModal
    );

}


if (closeRegister) {

    closeRegister.addEventListener(
        "click",
        closeRegisterModal
    );

}


// ============================================================
// CLOSE MODAL WHEN CLICKING BACKDROP
// ============================================================

if (registerModal) {

    const backdrop =
        registerModal.querySelector(
            ".modal-backdrop"
        );


    if (backdrop) {

        backdrop.addEventListener(
            "click",
            closeRegisterModal
        );

    }

}


// ============================================================
// ESC KEY
// ============================================================

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            registerModal &&
            registerModal.classList.contains(
                "show"
            )
        ) {

            closeRegisterModal();

        }

    }
);


// ============================================================
// REGISTER
// ============================================================

async function registerUser() {

    if (
        !registerName ||
        !registerEmail ||
        !registerPassword ||
        !registerConfirmPassword
    ) {

        return;

    }


    const name =
        registerName.value.trim();

    const email =
        registerEmail.value
            .trim()
            .toLowerCase();

    const password =
        registerPassword.value;

    const confirmPassword =
        registerConfirmPassword.value;


    // --------------------------------------------------------
    // Validation
    // --------------------------------------------------------

    if (
        name.length < 2 ||
        name.length > 100
    ) {

        showToast(
            "Name must contain between 2 and 100 characters.",
            "error",
            "Invalid name"
        );

        registerName.focus();

        return;

    }


    if (
        !isValidEmail(email)
    ) {

        showToast(
            "Please provide a valid email address.",
            "error",
            "Invalid email"
        );

        registerEmail.focus();

        return;

    }


    if (
        password.length < 6 ||
        password.length > 128
    ) {

        showToast(
            "Password must contain between 6 and 128 characters.",
            "error",
            "Invalid password"
        );

        registerPassword.focus();

        return;

    }


    if (
        password !==
        confirmPassword
    ) {

        showToast(
            "Passwords do not match.",
            "error",
            "Password mismatch"
        );

        registerConfirmPassword.focus();

        return;

    }


    if (
        registerTerms &&
        !registerTerms.checked
    ) {

        showToast(
            "Please accept the responsible-use agreement.",
            "error",
            "Agreement required"
        );

        return;

    }


    setButtonLoading(
        registerBtn,
        true,
        "Creating..."
    );


    try {

        const {
            response,
            data
        } =
            await apiRequest(
                "/api/register",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            name,
                            email,
                            password
                        })
                }
            );


        if (
            !response.ok ||
            !data.success
        ) {

            showToast(
                data.message ||
                "Unable to create your account.",
                "error",
                "Registration failed"
            );

            return;

        }


        showToast(
            "Your account has been created successfully. You can now sign in.",
            "success",
            "Account created"
        );


        // ----------------------------------------------------
        // Close modal
        // ----------------------------------------------------

        closeRegisterModal();


        // ----------------------------------------------------
        // Fill login fields
        // ----------------------------------------------------

        if (emailInput) {

            emailInput.value =
                email;

        }


        if (passwordInput) {

            passwordInput.value =
                "";

        }


        if (rememberInput) {

            rememberInput.checked =
                true;

        }


        saveRememberedEmail(
            email
        );


    } catch (error) {

        console.error(
            "REGISTER REQUEST ERROR:",
            error
        );


        showToast(
            error.message ||
            "Unable to connect to the server.",
            "error",
            "Connection error"
        );

    } finally {

        setButtonLoading(
            registerBtn,
            false
        );

    }

}


// ============================================================
// REGISTER FORM SUBMIT
// ============================================================

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            await registerUser();

        }
    );

}


// ============================================================
// FORGOT PASSWORD
// ============================================================

async function forgotPasswordFlow() {

    const currentEmail =
        emailInput
            ? emailInput.value
                .trim()
                .toLowerCase()
            : "";


    const email =
        currentEmail ||
        window.prompt(
            "Enter your account email address:"
        );


    if (
        email === null
    ) {

        return;

    }


    const normalizedEmail =
        String(email)
            .trim()
            .toLowerCase();


    if (
        !isValidEmail(
            normalizedEmail
        )
    ) {

        showToast(
            "Please enter a valid email address.",
            "error",
            "Invalid email"
        );

        return;

    }


    if (
        emailInput &&
        !emailInput.value
    ) {

        emailInput.value =
            normalizedEmail;

    }


    if (forgotPassword) {

        forgotPassword.disabled =
            true;

    }


    try {

        const {
            response,
            data
        } =
            await apiRequest(
                "/api/forgot-password",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            email:
                                normalizedEmail
                        })
                }
            );


        // ----------------------------------------------------
        // Backend intentionally returns a generic response
        // to prevent account enumeration.
        // ----------------------------------------------------

        if (
            !response.ok
        ) {

            showToast(
                data.message ||
                "Unable to process the request.",
                "error",
                "Request failed"
            );

            return;

        }


        showToast(
            data.message ||
            "If an account exists for this email, a password reset link has been sent.",
            "success",
            "Check your email"
        );


    } catch (error) {

        console.error(
            "FORGOT PASSWORD ERROR:",
            error
        );


        showToast(
            error.message ||
            "Unable to connect to the server.",
            "error",
            "Connection error"
        );

    } finally {

        if (forgotPassword) {

            forgotPassword.disabled =
                false;

        }

    }

}


if (forgotPassword) {

    forgotPassword.addEventListener(
        "click",
        forgotPasswordFlow
    );

}


// ============================================================
// SOCIAL LOGIN PLACEHOLDERS
// ============================================================
//
// Google and GitHub OAuth are not configured in the current
// backend. Do not pretend these buttons are functional OAuth.
//
// They remain ready for a future OAuth implementation.
// ============================================================

if (googleLogin) {

    googleLogin.addEventListener(
        "click",
        () => {

            showToast(
                "Google authentication is not configured yet.",
                "info",
                "Google Login"
            );

        }
    );

}


if (githubLogin) {

    githubLogin.addEventListener(
        "click",
        () => {

            showToast(
                "GitHub authentication is not configured yet.",
                "info",
                "GitHub Login"
            );

        }
    );

}


// ============================================================
// EXISTING SESSION CHECK
// ============================================================

async function checkExistingSession() {

    const token =
        sessionStorage.getItem(
            TOKEN_KEY
        );


    if (!token) {

        return;

    }


    try {

        const {
            response,
            data
        } =
            await apiRequest(
                "/api/me",
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (
            response.ok &&
            data.success
        ) {

            if (data.user) {

                sessionStorage.setItem(
                    USER_KEY,
                    JSON.stringify(
                        data.user
                    )
                );

            }


            // Existing valid session.
            // Do not show login again.

            window.location.href =
                "dashboard.html";

        } else {

            sessionStorage.removeItem(
                TOKEN_KEY
            );

            sessionStorage.removeItem(
                USER_KEY
            );

        }

    } catch (error) {

        // Do not block the login page if
        // the Render service is waking up.

        console.warn(
            "Existing session check failed:",
            error.message
        );

    }

}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadRememberedEmail();

        checkExistingSession();

    }
);
