// =====================================================
// PRIYANSHU SECURE PORTAL
// Frontend Authentication Controller
// =====================================================

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");

const loginBtn =
    document.getElementById("loginBtn");

const particlesContainer =
    document.getElementById("particles");

const toast =
    document.getElementById("toast");

const toastTitle =
    document.getElementById("toastTitle");

const toastMessage =
    document.getElementById("toastMessage");

const card =
    document.querySelector(".login-card");


// =====================================================
// API CONFIGURATION
// =====================================================

// Local development
const API_URL = "http://localhost:5000";


// =====================================================
// PASSWORD TOGGLE
// =====================================================

togglePassword.addEventListener("click", () => {

    const hidden =
        passwordInput.type === "password";

    passwordInput.type =
        hidden ? "text" : "password";

    togglePassword.textContent =
        hidden ? "🙈" : "👁";

});


// =====================================================
// PARTICLES
// =====================================================

function createParticles() {

    const total = 55;

    for (let i = 0; i < total; i++) {

        const particle =
            document.createElement("span");

        particle.className =
            "particle";

        particle.style.left =
            Math.random() * 100 + "%";

        particle.style.animationDuration =
            (6 + Math.random() * 12) + "s";

        particle.style.animationDelay =
            Math.random() * 10 + "s";

        particle.style.opacity =
            0.15 + Math.random() * 0.55;

        const size =
            1 + Math.random() * 3;

        particle.style.width =
            size + "px";

        particle.style.height =
            size + "px";

        particlesContainer.appendChild(
            particle
        );

    }
}

createParticles();


// =====================================================
// TOAST
// =====================================================

let toastTimer;

function showToast(
    title,
    message,
    type = "success"
) {

    clearTimeout(toastTimer);

    toastTitle.textContent =
        title;

    toastMessage.textContent =
        message;

    const icon =
        toast.querySelector(
            ".toast-icon"
        );

    if (type === "error") {

        icon.textContent = "×";

        icon.style.background =
            "#ff5577";

    } else {

        icon.textContent = "✓";

        icon.style.background =
            "#35e88b";

    }

    toast.classList.add("show");

    toastTimer = setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 3500);

}


// =====================================================
// EMAIL VALIDATION
// =====================================================

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


// =====================================================
// LOGIN
// =====================================================

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        // -------------------------------
        // VALIDATION
        // -------------------------------

        if (!email) {

            showToast(
                "Email Required",
                "Please enter your email.",
                "error"
            );

            emailInput.focus();

            return;
        }


        if (!isValidEmail(email)) {

            showToast(
                "Invalid Email",
                "Please enter a valid email.",
                "error"
            );

            emailInput.focus();

            return;
        }


        if (!password) {

            showToast(
                "Password Required",
                "Please enter your password.",
                "error"
            );

            passwordInput.focus();

            return;
        }


        // -------------------------------
        // LOADING
        // -------------------------------

        loginBtn.classList.add(
            "loading"
        );

        loginBtn.disabled = true;


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


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Login failed."
                );

            }


            // -------------------------------
            // SUCCESS
            // -------------------------------

            showToast(
                "Login Successful",
                `Welcome ${result.user.name || ""}!`
            );


            // Save non-sensitive user info
            sessionStorage.setItem(
                "user",
                JSON.stringify({
                    id: result.user.id,
                    name: result.user.name,
                    email: result.user.email
                })
            );


            // Clear password
            passwordInput.value = "";


        }

        catch (error) {

            console.error(
                "Login error:",
                error
            );


            showToast(
                "Login Failed",
                error.message ||
                "Unable to connect to server.",
                "error"
            );

        }

        finally {

            loginBtn.classList.remove(
                "loading"
            );

            loginBtn.disabled = false;

        }

    }
);


// =====================================================
// FORGOT PASSWORD
// =====================================================

document
    .getElementById("forgotPassword")
    .addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            showToast(
                "Password Recovery",
                "Recovery will be added in a later step."
            );

        }
    );


// =====================================================
// REGISTER
// =====================================================

document
    .getElementById("registerLink")
    .addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            showToast(
                "Registration",
                "Registration page will be added next."
            );

        }
    );


// =====================================================
// GOOGLE
// =====================================================

document
    .getElementById("googleLogin")
    .addEventListener(
        "click",
        () => {

            showToast(
                "Google Login",
                "OAuth will be configured later."
            );

        }
    );


// =====================================================
// GITHUB
// =====================================================

document
    .getElementById("githubLogin")
    .addEventListener(
        "click",
        () => {

            showToast(
                "GitHub Login",
                "OAuth will be configured later."
            );

        }
    );


// =====================================================
// 3D CARD EFFECT
// =====================================================

if (
    window.matchMedia(
        "(pointer: fine)"
    ).matches
) {

    card.addEventListener(
        "mousemove",
        (event) => {

            const rect =
                card.getBoundingClientRect();

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

            const rotateY =
                ((x - centerX) /
                centerX) * 4;

            const rotateX =
                ((centerY - y) /
                centerY) * 4;

            card.style.transform =
                `perspective(1200px)
                 rotateX(${rotateX}deg)
                 rotateY(${rotateY}deg)
                 translateY(-2px)`;

        }
    );


    card.addEventListener(
        "mouseleave",
        () => {

            card.style.transform =
                `perspective(1200px)
                 rotateX(0deg)
                 rotateY(0deg)
                 translateY(0)`;

        }
    );

}


// =====================================================
// PAGE READY
// =====================================================

window.addEventListener(
    "load",
    () => {

        setTimeout(() => {

            showToast(
                "Secure Portal",
                "Priyanshu Secure Portal is ready."
            );

        }, 900);

    }
);
