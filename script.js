// ============================================================
// PRIYANSHU SECURE PORTAL
// Advanced JWT Authentication Frontend
// Version 2.6.1
// ============================================================

const API_URL = "https://priyanshu-secure-auth.onrender.com";

// ============================================================
// DOM ELEMENTS
// ============================================================

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const forgotPassword = document.getElementById("forgotPassword");
const rememberCheckbox = document.getElementById("remember");
const loginBtn = document.getElementById("loginBtn");

const registerModal = document.getElementById("registerModal");
const registerOverlay = document.getElementById("registerOverlay");
const registerClose = document.getElementById("registerClose");
const registerLink = document.getElementById("registerLink");

const registerForm = document.getElementById("registerForm");
const registerName = document.getElementById("registerName");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const confirmPassword = document.getElementById("confirmPassword");
const toggleRegisterPassword =
    document.getElementById("toggleRegisterPassword");
const toggleConfirmPassword =
    document.getElementById("toggleConfirmPassword");
const passwordStrength =
    document.getElementById("passwordStrength");
const acceptTerms =
    document.getElementById("acceptTerms");
const registerBtn =
    document.getElementById("registerBtn");
const backToLogin =
    document.getElementById("backToLogin");

const toast = document.getElementById("toast");
const toastTitle = document.getElementById("toastTitle");
const toastMessage = document.getElementById("toastMessage");

// ============================================================
// HELPERS
// ============================================================

function exists(element) {
    return element !== null && element !== undefined;
}

// ============================================================
// TOAST
// ============================================================

let toastTimer = null;

function showToast(title, message, type = "success") {
    if (!exists(toast)) {
        alert(`${title}\n${message}`);
        return;
    }

    if (exists(toastTitle)) {
        toastTitle.textContent = title;
    }

    if (exists(toastMessage)) {
        toastMessage.textContent = message;
    }

    toast.classList.remove(
        "success",
        "error",
        "warning",
        "show"
    );

    toast.classList.add(type);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}

// ============================================================
// PASSWORD TOGGLE
// ============================================================

function setupPasswordToggle(button, input) {
    if (!exists(button) || !exists(input)) {
        return;
    }

    button.addEventListener("click", () => {
        const isPassword = input.type === "password";

        input.type = isPassword ? "text" : "password";

        button.textContent = isPassword ? "🙈" : "👁";

        button.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );
    });
}

setupPasswordToggle(togglePassword, passwordInput);
setupPasswordToggle(toggleRegisterPassword, registerPassword);
setupPasswordToggle(toggleConfirmPassword, confirmPassword);

// ============================================================
// VALIDATION
// ============================================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function calculatePasswordStrength(password) {
    if (!password) {
        return {
            score: 0,
            text: "Password strength"
        };
    }

    let score = 0;

    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
        return {
            score: 1,
            text: "Weak password"
        };
    }

    if (score <= 4) {
        return {
            score: 2,
            text: "Medium password"
        };
    }

    return {
        score: 3,
        text: "Strong password"
    };
}

function updatePasswordStrength() {
    if (!exists(registerPassword) || !exists(passwordStrength)) {
        return;
    }

    const result =
        calculatePasswordStrength(registerPassword.value);

    const bar =
        passwordStrength.querySelector(".strength-bar span");

    const label =
        passwordStrength.querySelector("small");

    if (bar) {
        if (result.score === 0) bar.style.width = "0%";
        if (result.score === 1) bar.style.width = "33%";
        if (result.score === 2) bar.style.width = "66%";
        if (result.score === 3) bar.style.width = "100%";
    }

    if (label) {
        label.textContent = result.text;
    }

    passwordStrength.dataset.strength = result.score;
}

// ============================================================
// PASSWORD MATCH
// ============================================================

function validatePasswordMatch() {
    if (!exists(registerPassword) || !exists(confirmPassword)) {
        return true;
    }

    if (!confirmPassword.value) {
        confirmPassword.setCustomValidity("");
        return true;
    }

    if (registerPassword.value !== confirmPassword.value) {
        confirmPassword.setCustomValidity(
            "Passwords do not match."
        );

        return false;
    }

    confirmPassword.setCustomValidity("");

    return true;
}

if (exists(registerPassword)) {
    registerPassword.addEventListener("input", () => {
        validatePasswordMatch();
        updatePasswordStrength();
    });
}

if (exists(confirmPassword)) {
    confirmPassword.addEventListener(
        "input",
        validatePasswordMatch
    );
}

// ============================================================
// REGISTER MODAL
// ============================================================

function openRegisterModal() {
    if (!exists(registerModal)) {
        return;
    }

    registerModal.classList.add("active");
    document.body.classList.add("modal-open");

    setTimeout(() => {
        if (exists(registerName)) {
            registerName.focus();
        }
    }, 200);
}

function closeRegisterModal() {
    if (!exists(registerModal)) {
        return;
    }

    registerModal.classList.remove("active");
    document.body.classList.remove("modal-open");
}

if (exists(registerLink)) {
    registerLink.addEventListener("click", event => {
        event.preventDefault();
        openRegisterModal();
    });
}

if (exists(registerClose)) {
    registerClose.addEventListener(
        "click",
        closeRegisterModal
    );
}

if (exists(registerOverlay)) {
    registerOverlay.addEventListener(
        "click",
        closeRegisterModal
    );
}

if (exists(backToLogin)) {
    backToLogin.addEventListener(
        "click",
        closeRegisterModal
    );
}

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        exists(registerModal) &&
        registerModal.classList.contains("active")
    ) {
        closeRegisterModal();
    }
});

// ============================================================
// BUTTON LOADING
// ============================================================

function setLoginLoading(isLoading) {
    if (!exists(loginBtn)) {
        return;
    }

    loginBtn.disabled = isLoading;
    loginBtn.classList.toggle("loading", isLoading);

    const text =
        loginBtn.querySelector(".btn-text");

    if (text) {
        text.textContent =
            isLoading ? "Signing In..." : "Sign In";
    }
}

function setRegisterLoading(isLoading) {
    if (!exists(registerBtn)) {
        return;
    }

    registerBtn.disabled = isLoading;
    registerBtn.classList.toggle("loading", isLoading);

    const text =
        registerBtn.querySelector(".register-btn-text");

    if (text) {
        text.textContent =
            isLoading
                ? "Creating Account..."
                : "Create Secure Account";
    }
}

// ============================================================
// REMEMBER EMAIL
// ============================================================

function loadRememberedEmail() {
    try {
        const savedEmail =
            localStorage.getItem(
                "priynashu_remember_email"
            );

        if (savedEmail && exists(emailInput)) {
            emailInput.value = savedEmail;

            if (exists(rememberCheckbox)) {
                rememberCheckbox.checked = true;
            }
        }
    } catch (error) {
        console.warn(
            "Unable to read remembered email.",
            error
        );
    }
}

function saveRememberedEmail() {
    try {
        if (
            exists(rememberCheckbox) &&
            rememberCheckbox.checked &&
            exists(emailInput)
        ) {
            localStorage.setItem(
                "priynashu_remember_email",
                emailInput.value.trim()
            );
        } else {
            localStorage.removeItem(
                "priynashu_remember_email"
            );
        }
    } catch (error) {
        console.warn(
            "Unable to save remembered email.",
            error
        );
    }
}

loadRememberedEmail();

// ============================================================
// JWT SESSION STORAGE
// ============================================================

const TOKEN_KEY =
    "priynashu_access_token";

const USER_KEY =
    "priynashu_user";

function saveAuthToken(token) {
    if (!token) {
        return false;
    }

    try {
        sessionStorage.setItem(
            TOKEN_KEY,
            token
        );

        return true;

    } catch (error) {
        console.error(
            "Unable to save authentication token.",
            error
        );

        return false;
    }
}

function getAuthToken() {
    try {
        return sessionStorage.getItem(
            TOKEN_KEY
        );
    } catch (error) {
        console.error(
            "Unable to read authentication token.",
            error
        );

        return null;
    }
}

function saveAuthenticatedUser(user) {
    if (!user) {
        return;
    }

    try {
        sessionStorage.setItem(
            USER_KEY,
            JSON.stringify(user)
        );
    } catch (error) {
        console.error(
            "Unable to save authenticated user.",
            error
        );
    }
}

function getStoredUser() {
    try {
        const value =
            sessionStorage.getItem(
                USER_KEY
            );

        return value
            ? JSON.parse(value)
            : null;

    } catch (error) {
        console.error(
            "Unable to read stored user.",
            error
        );

        return null;
    }
}

// ============================================================
// LOGOUT / CLEAR SESSION
// ============================================================

function logoutUser(showMessage = true) {
    try {
        sessionStorage.removeItem(
            TOKEN_KEY
        );

        sessionStorage.removeItem(
            USER_KEY
        );

        console.log(
            "🔒 JWT session cleared."
        );

        if (showMessage) {
            showToast(
                "Logged Out",
                "Your secure session has been ended.",
                "success"
            );
        }

    } catch (error) {
        console.error(
            "Logout error:",
            error
        );
    }
}

// Make logout available to future dashboard buttons.
window.priyanshuLogout = logoutUser;

// ============================================================
// AUTHENTICATED USER
// ============================================================

async function getAuthenticatedUser() {
    const token =
        getAuthToken();

    if (!token) {
        return null;
    }

    try {
        const response =
            await fetch(
                `${API_URL}/api/me`,
                {
                    method: "GET",
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {
            logoutUser(false);
            return null;
        }

        if (data.user) {
            saveAuthenticatedUser(
                data.user
            );
        }

        return data.user;

    } catch (error) {
        console.error(
            "AUTHENTICATED USER ERROR:",
            error
        );

        return null;
    }
}

// ============================================================
// LOGIN
// ============================================================

if (exists(loginForm)) {
    loginForm.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const email =
                emailInput.value
                    .trim()
                    .toLowerCase();

            const password =
                passwordInput.value;

            if (!email) {
                showToast(
                    "Email Required",
                    "Please enter your email address.",
                    "warning"
                );

                emailInput.focus();
                return;
            }

            if (!isValidEmail(email)) {
                showToast(
                    "Invalid Email",
                    "Please enter a valid email address.",
                    "warning"
                );

                emailInput.focus();
                return;
            }

            if (!password) {
                showToast(
                    "Password Required",
                    "Please enter your password.",
                    "warning"
                );

                passwordInput.focus();
                return;
            }

            setLoginLoading(true);

            try {
                const response =
                    await fetch(
                        `${API_URL}/api/login`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                email,
                                password
                            })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Login failed."
                    );
                }

                if (!data.token) {
                    throw new Error(
                        "Authentication token was not received from the server."
                    );
                }

                // Save JWT
                saveAuthToken(
                    data.token
                );

                // Save safe user data
                saveAuthenticatedUser(
                    data.user
                );

                saveRememberedEmail();

                showToast(
                    "Login Successful",
                    `Welcome back, ${data.user.name}!`,
                    "success"
                );

                passwordInput.value = "";

                console.log(
                    "🔐 JWT authentication successful."
                );

                console.log(
                    "👤 Authenticated user:",
                    data.user
                );

                console.log(
                    "⏱️ Token expiry:",
                    data.expiresIn
                );

                // Verify protected endpoint
                const verifiedUser =
                    await getAuthenticatedUser();

                if (verifiedUser) {
                    console.log(
                        "✅ Protected /api/me verification successful."
                    );
                }

            } catch (error) {
                console.error(
                    "LOGIN ERROR:",
                    error
                );

                logoutUser(false);

                showToast(
                    "Login Failed",
                    error.message ||
                    "Unable to connect to the authentication server.",
                    "error"
                );

            } finally {
                setLoginLoading(false);
            }
        }
    );
}

// ============================================================
// REGISTRATION
// ============================================================

if (exists(registerForm)) {
    registerForm.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const name =
                registerName.value.trim();

            const email =
                registerEmail.value
                    .trim()
                    .toLowerCase();

            const password =
                registerPassword.value;

            const confirm =
                confirmPassword.value;

            if (name.length < 2) {
                showToast(
                    "Invalid Name",
                    "Please enter your full name.",
                    "warning"
                );

                registerName.focus();
                return;
            }

            if (!isValidEmail(email)) {
                showToast(
                    "Invalid Email",
                    "Please enter a valid email address.",
                    "warning"
                );

                registerEmail.focus();
                return;
            }

            if (password.length < 6) {
                showToast(
                    "Weak Password",
                    "Password must contain at least 6 characters.",
                    "warning"
                );

                registerPassword.focus();
                return;
            }

            if (password !== confirm) {
                showToast(
                    "Password Mismatch",
                    "Password and confirm password must match.",
                    "error"
                );

                confirmPassword.focus();
                return;
            }

            if (
                exists(acceptTerms) &&
                !acceptTerms.checked
            ) {
                showToast(
                    "Terms Required",
                    "Please accept the Terms & Privacy Policy.",
                    "warning"
                );

                return;
            }

            setRegisterLoading(true);

            try {
                const response =
                    await fetch(
                        `${API_URL}/api/register`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                name,
                                email,
                                password
                            })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Registration failed."
                    );
                }

                showToast(
                    "Account Created",
                    "Your secure account has been created successfully.",
                    "success"
                );

                if (exists(emailInput)) {
                    emailInput.value =
                        data.user.email;
                }

                registerName.value = "";
                registerEmail.value = "";
                registerPassword.value = "";
                confirmPassword.value = "";

                if (exists(acceptTerms)) {
                    acceptTerms.checked = false;
                }

                updatePasswordStrength();

                closeRegisterModal();

                setTimeout(() => {
                    if (exists(passwordInput)) {
                        passwordInput.focus();
                    }
                }, 300);

            } catch (error) {
                console.error(
                    "REGISTER ERROR:",
                    error
                );

                showToast(
                    "Registration Failed",
                    error.message ||
                    "Unable to create your account.",
                    "error"
                );

            } finally {
                setRegisterLoading(false);
            }
        }
    );
}

// ============================================================
// FORGOT PASSWORD
// ============================================================

if (exists(forgotPassword)) {
    forgotPassword.addEventListener(
        "click",
        event => {
            event.preventDefault();

            showToast(
                "Password Recovery",
                "Password recovery will be added in the next security module.",
                "warning"
            );
        }
    );
}

// ============================================================
// GOOGLE LOGIN
// ============================================================

const googleLogin =
    document.getElementById(
        "googleLogin"
    );

if (exists(googleLogin)) {
    googleLogin.addEventListener(
        "click",
        () => {
            showToast(
                "Google Authentication",
                "Google OAuth will be connected in the next authentication upgrade.",
                "warning"
            );
        }
    );
}

// ============================================================
// GITHUB LOGIN
// ============================================================

const githubLogin =
    document.getElementById(
        "githubLogin"
    );

if (exists(githubLogin)) {
    githubLogin.addEventListener(
        "click",
        () => {
            showToast(
                "GitHub Authentication",
                "GitHub OAuth will be connected in the next authentication upgrade.",
                "warning"
            );
        }
    );
}

// ============================================================
// PARTICLES
// ============================================================

const particlesContainer =
    document.getElementById(
        "particles"
    );

function createParticles() {
    if (!exists(particlesContainer)) {
        return;
    }

    const particleCount =
        window.innerWidth < 600
            ? 18
            : 35;

    particlesContainer.innerHTML = "";

    for (
        let i = 0;
        i < particleCount;
        i++
    ) {
        const particle =
            document.createElement("span");

        particle.className =
            "particle";

        const size =
            Math.random() * 4 + 1;

        particle.style.width =
            `${size}px`;

        particle.style.height =
            `${size}px`;

        particle.style.left =
            `${Math.random() * 100}%`;

        particle.style.top =
            `${Math.random() * 100}%`;

        particle.style.animationDelay =
            `${Math.random() * 8}s`;

        particle.style.animationDuration =
            `${5 + Math.random() * 8}s`;

        particlesContainer.appendChild(
            particle
        );
    }
}

createParticles();

window.addEventListener(
    "resize",
    createParticles
);

// ============================================================
// 3D LOGIN CARD
// ============================================================

const loginCard =
    document.querySelector(
        ".login-card"
    );

if (
    exists(loginCard) &&
    window.matchMedia(
        "(pointer:fine)"
    ).matches
) {
    loginCard.addEventListener(
        "mousemove",
        event => {
            const rect =
                loginCard.getBoundingClientRect();

            const x =
                event.clientX -
                rect.left;

            const y =
                event.clientY -
                rect.top;

            const centerX =
                rect.width / 2;

            const centerY =
                rect.height / 2;

            const rotateX =
                ((y - centerY) /
                    centerY) *
                -2;

            const rotateY =
                ((x - centerX) /
                    centerX) *
                2;

            loginCard.style.transform =
                `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
        }
    );

    loginCard.addEventListener(
        "mouseleave",
        () => {
            loginCard.style.transform = "";
        }
    );
}

// ============================================================
// BUTTON RIPPLE
// ============================================================

document.addEventListener(
    "click",
    event => {
        const button =
            event.target.closest("button");

        if (!button) {
            return;
        }

        const ripple =
            document.createElement("span");

        ripple.className =
            "click-ripple";

        const rect =
            button.getBoundingClientRect();

        ripple.style.left =
            `${event.clientX - rect.left}px`;

        ripple.style.top =
            `${event.clientY - rect.top}px`;

        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 700);
    }
);

// ============================================================
// API HEALTH CHECK
// ============================================================

async function checkAPIConnection() {
    try {
        const response =
            await fetch(
                `${API_URL}/api/health`,
                {
                    method: "GET"
                }
            );

        if (!response.ok) {
            throw new Error(
                "API unavailable"
            );
        }

        const data =
            await response.json();

        console.log(
            "✅ Secure Portal API connected:",
            data
        );

    } catch (error) {
        console.warn(
            "⚠️ Secure Portal API connection unavailable.",
            error
        );
    }
}

checkAPIConnection();

// ============================================================
// RESTORE EXISTING JWT SESSION
// ============================================================

async function restoreAuthenticatedSession() {
    const token =
        getAuthToken();

    if (!token) {
        return;
    }

    const storedUser =
        getStoredUser();

    if (storedUser) {
        console.log(
            "👤 Stored user session found:",
            storedUser
        );
    }

    const user =
        await getAuthenticatedUser();

    if (user) {
        console.log(
            "🔓 JWT session verified successfully:",
            user
        );
    } else {
        console.log(
            "🔒 JWT session expired or invalid."
        );
    }
}

restoreAuthenticatedSession();

// ============================================================
// PAGE READY
// ============================================================

window.addEventListener(
    "load",
    () => {
        setTimeout(() => {
            console.log(
                "🔐 Priyanshu Secure Portal initialized."
            );

            console.log(
                "🚀 Backend:",
                API_URL
            );

            console.log(
                "🛡️ JWT authentication: ACTIVE"
            );

            console.log(
                "🔒 Session management: ACTIVE"
            );

        }, 300);
    }
);
