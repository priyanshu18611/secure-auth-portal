// =====================================================
// PRIYANSHU SECURE PORTAL
// Advanced Login UI Controller
// =====================================================


// ================= ELEMENTS =================

const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");

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
// PASSWORD SHOW / HIDE
// =====================================================

togglePassword.addEventListener("click", () => {

    const isHidden =
        passwordInput.type === "password";

    passwordInput.type =
        isHidden ? "text" : "password";

    togglePassword.textContent =
        isHidden ? "🙈" : "👁";

});


// =====================================================
// CREATE PARTICLES
// =====================================================

function createParticles() {

    const totalParticles = 55;

    for (
        let i = 0;
        i < totalParticles;
        i++
    ) {

        const particle =
            document.createElement("span");

        particle.classList.add("particle");

        particle.style.left =
            Math.random() * 100 + "%";

        particle.style.animationDuration =
            (6 + Math.random() * 12) + "s";

        particle.style.animationDelay =
            Math.random() * 10 + "s";

        particle.style.opacity =
            (0.15 + Math.random() * 0.55);

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
// TOAST SYSTEM
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
        toast.querySelector(".toast-icon");


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

        toast.classList.remove("show");

    }, 3500);

}


// =====================================================
// INPUT FOCUS EFFECT
// =====================================================

const inputs =
    document.querySelectorAll(
        ".input-box input"
    );


inputs.forEach(input => {

    input.addEventListener(
        "focus",
        () => {

            input
                .closest(".input-box")
                .classList.add("active");

        }
    );


    input.addEventListener(
        "blur",
        () => {

            input
                .closest(".input-box")
                .classList.remove("active");

        }
    );

});


// =====================================================
// EMAIL VALIDATION
// =====================================================

function isValidEmail(email) {

    const pattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return pattern.test(email);
}


// =====================================================
// LOGIN FORM
// =====================================================

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value.trim();


        // -----------------------------
        // EMAIL CHECK
        // -----------------------------

        if (!email) {

            showToast(
                "Email Required",
                "Please enter your email address.",
                "error"
            );

            emailInput.focus();

            return;
        }


        if (!isValidEmail(email)) {

            showToast(
                "Invalid Email",
                "Please enter a valid email address.",
                "error"
            );

            emailInput.focus();

            return;
        }


        // -----------------------------
        // PASSWORD CHECK
        // -----------------------------

        if (!password) {

            showToast(
                "Password Required",
                "Please enter your password.",
                "error"
            );

            passwordInput.focus();

            return;
        }


        if (password.length < 6) {

            showToast(
                "Weak Password",
                "Password must contain at least 6 characters.",
                "error"
            );

            passwordInput.focus();

            return;
        }


        // -----------------------------
        // LOADING
        // -----------------------------

        loginBtn.classList.add(
            "loading"
        );

        loginBtn.disabled = true;


        /*
         * BACKEND CONNECTION
         *
         * Part 5/6 mein yahan:
         *
         * fetch("/api/login", {
         *
         *     method: "POST",
         *
         *     headers: {
         *         "Content-Type":
         *             "application/json"
         *     },
         *
         *     body: JSON.stringify({
         *         email: email,
         *         password: password
         *     })
         *
         * });
         *
         */


        // Temporary demo delay

        await new Promise(resolve => {

            setTimeout(
                resolve,
                1500
            );

        });


        loginBtn.classList.remove(
            "loading"
        );

        loginBtn.disabled = false;


        showToast(
            "Demo Login",
            "Backend connection will be added next."
        );

    }
);


// =====================================================
// FORGOT PASSWORD
// =====================================================

const forgotPassword =
    document.getElementById(
        "forgotPassword"
    );


forgotPassword.addEventListener(
    "click",
    (event) => {

        event.preventDefault();


        showToast(
            "Password Recovery",
            "Recovery system will be connected later."
        );

    }
);


// =====================================================
// REGISTER LINK
// =====================================================

const registerLink =
    document.getElementById(
        "registerLink"
    );


registerLink.addEventListener(
    "click",
    (event) => {

        event.preventDefault();


        showToast(
            "Create Account",
            "Registration system will be added next."
        );

    }
);


// =====================================================
// GOOGLE BUTTON
// =====================================================

const googleLogin =
    document.getElementById(
        "googleLogin"
    );


googleLogin.addEventListener(
    "click",
    () => {

        showToast(
            "Google Login",
            "Google authentication will be configured later."
        );

    }
);


// =====================================================
// GITHUB BUTTON
// =====================================================

const githubLogin =
    document.getElementById(
        "githubLogin"
    );


githubLogin.addEventListener(
    "click",
    () => {

        showToast(
            "GitHub Login",
            "GitHub authentication will be configured later."
        );

    }
);


// =====================================================
// 3D CARD MOUSE EFFECT
// =====================================================

if (window.matchMedia(
    "(pointer: fine)"
).matches) {

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
// BUTTON RIPPLE EFFECT
// =====================================================

loginBtn.addEventListener(
    "click",
    (event) => {

        const ripple =
            document.createElement(
                "span"
            );


        ripple.style.position =
            "absolute";

        ripple.style.width =
            "10px";

        ripple.style.height =
            "10px";

        ripple.style.borderRadius =
            "50%";

        ripple.style.background =
            "rgba(255,255,255,0.35)";

        ripple.style.left =
            event.offsetX + "px";

        ripple.style.top =
            event.offsetY + "px";

        ripple.style.transform =
            "translate(-50%, -50%)";

        ripple.style.pointerEvents =
            "none";

        ripple.style.animation =
            "rippleEffect 0.7s ease-out";


        loginBtn.appendChild(
            ripple
        );


        setTimeout(
            () => ripple.remove(),
            700
        );

    }
);


// =====================================================
// RIPPLE ANIMATION
// =====================================================

const rippleStyle =
    document.createElement("style");

rippleStyle.textContent = `

@keyframes rippleEffect {

    from {
        width: 10px;
        height: 10px;
        opacity: 1;
    }

    to {
        width: 500px;
        height: 500px;
        opacity: 0;
    }

}

`;

document.head.appendChild(
    rippleStyle
);


// =====================================================
// PAGE READY
// =====================================================

window.addEventListener(
    "load",
    () => {

        setTimeout(
            () => {

                showToast(
                    "Welcome",
                    "Priyanshu Secure Portal is ready."
                );

            },
            900
        );

    }
);
