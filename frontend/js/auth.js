// frontend/js/auth.js
// Handles Google OAuth only on index.html

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

// If already logged in, skip straight to buy page
if (localStorage.getItem("ssm_token")) {
  window.location.href = "html/buy.html";
}

// -------------------------------------------------------
// Google Sign-In callback — must be global on window
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

    if (data.pending) {
      // New user — store name + email from Google, show profile form
      sessionStorage.setItem("ssm_pending_google", JSON.stringify({ name: data.name, email: data.email }));
      showCompleteProfileForm();
    } else {
      // Existing user — log straight in
      saveSession(data);
      window.location.href = "html/buy.html";
    }
  } catch (err) {
    googleError.textContent = "Could not connect to server. Please try again.";
  }
};

// -------------------------------------------------------
// Show complete-profile form, hide Google button
// -------------------------------------------------------
function showCompleteProfileForm() {
  document.getElementById("google-section").classList.add("hidden");
  document.getElementById("complete-profile-form").classList.remove("hidden");
}

// -------------------------------------------------------
// Complete Profile submission (new Google users only)
// -------------------------------------------------------
document.getElementById("complete-profile-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("complete-profile-error");
  errorEl.textContent = "";

  const pending = JSON.parse(sessionStorage.getItem("ssm_pending_google") || "{}");
  if (!pending.email) {
    errorEl.textContent = "Session expired. Please sign in with Google again.";
    showGoogleSection();
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: pending.name,
        email: pending.email,
        rollNumber: document.getElementById("cp-roll").value.trim(),
        universityRegisterNumber: document.getElementById("cp-university-reg").value.trim(),
        dob: document.getElementById("cp-dob").value,
        department: document.getElementById("cp-department").value,
        year: document.getElementById("cp-year").value,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.message || "Failed to save profile. Please try again.";
      return;
    }

    sessionStorage.removeItem("ssm_pending_google");
    saveSession(data);
    window.location.href = "html/buy.html";
  } catch (err) {
    errorEl.textContent = "Could not connect to server. Please try again.";
  }
});

function showGoogleSection() {
  document.getElementById("google-section").classList.remove("hidden");
  document.getElementById("complete-profile-form").classList.add("hidden");
}
