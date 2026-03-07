// frontend/js/auth.js
// Handles login and register forms on index.html

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
  window.location.href = "buy.html";
}

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

// LOGIN
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
    window.location.href = "buy.html"; // Redirect to Buy page after login
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// REGISTER
registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("register-error");
  errorEl.textContent = "";

  const department = document.getElementById("register-department").value;
  const year = document.getElementById("register-year").value;

  try {
    const userData = await registerUser({
      name: document.getElementById("register-name").value,
      email: document.getElementById("register-email").value,
      password: document.getElementById("register-password").value,
      rollNumber: document.getElementById("register-roll").value,
      universityRegisterNumber: document.getElementById("register-university-reg").value,
      dob: document.getElementById("register-dob").value,
      department,
      year,
    });
    saveSession(userData);
    window.location.href = "buy.html"; // Redirect to Buy page after register
  } catch (err) {
    errorEl.textContent = err.message;
  }
});
