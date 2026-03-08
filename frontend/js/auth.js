// frontend/js/auth.js
// Handles login, register, and Google OAuth on index.html

const GOOGLE_CLIENT_ID = "224675395582-o7l2qb4bl9c3hr8cjtondr8t010gqro7.apps.googleusercontent.com";

function saveSession(userData) {
  localStorage.setItem("ssm_token", userData.token);
  localStorage.setItem("ssm_current_user", JSON.stringify({
    _id: userData._id,
    name: userData.name,
    email: userData.email,
    rollNumber: userData.rollNumber,
    universityRegisterNumber: userData.universityRegisterNumber,
    dob: userData.dob,
    department: userData.department,
    year: userData.year,
    isVerifiedStudent: userData.isVerifiedStudent,
  }));
}

// If already logged in, skip to buy page
if (localStorage.getItem("ssm_token")) {
  window.location.href = "html/buy.html";
}

// -------------------------------------------------------
// Google Sign-In callback — must be on window to be global
// -------------------------------------------------------
window.handleGoogleResponse = async function(response) {
  const googleError = document.getElementById("google-error");
  googleError.textContent = "";

  try {
    const res = await fetch("http://localhost:5000/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });

    const data = await res.json();

    if (!res.ok) {
      googleError.textContent = data.message || "Google sign-in failed.";
      return;
    }

    saveSession(data);
    window.location.href = "html/buy.html";
  } catch (err) {
    googleError.textContent = "Could not connect to server. Please try again.";
  }
}

// -------------------------------------------------------
// Toggle Login / Register forms
// -------------------------------------------------------
const loginToggle = document.getElementById("show-login");
const registerToggle = document.getElementById("show-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

loginToggle?.addEventListener("click", () => {
  loginToggle.classList.add("active");
  registerToggle.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  document.getElementById("login-error").textContent = "";
  document.getElementById("register-error").textContent = "";
});

registerToggle?.addEventListener("click", () => {
  registerToggle.classList.add("active");
  loginToggle.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  document.getElementById("login-error").textContent = "";
  document.getElementById("register-error").textContent = "";
});

// -------------------------------------------------------
// Login
// -------------------------------------------------------
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";
  try {
    const userData = await loginUser(
      document.getElementById("login-email").value,
      document.getElementById("login-password").value
    );
    saveSession(userData);
    window.location.href = "html/buy.html";
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// -------------------------------------------------------
// Register
// -------------------------------------------------------
registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("register-error");
  errorEl.textContent = "";
  try {
    const userData = await registerUser({
      name: document.getElementById("register-name").value,
      email: document.getElementById("register-email").value,
      password: document.getElementById("register-password").value,
      rollNumber: document.getElementById("register-roll").value,
      universityRegisterNumber: document.getElementById("register-university-reg").value,
      dob: document.getElementById("register-dob").value,
      department: document.getElementById("register-department").value,
      year: document.getElementById("register-year").value,
    });
    saveSession(userData);
    window.location.href = "html/buy.html";
  } catch (err) {
    errorEl.textContent = err.message;
  }
});
