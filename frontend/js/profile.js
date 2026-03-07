// frontend/js/profile.js
// Logic for profile.html — displays all user details

initNav(); // from common.js

const user = getCurrentUser();

if (user) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "—";
  };

  set("profile-name", user.name);
  set("profile-email", user.email);
  set("profile-roll", user.rollNumber);
  set("profile-university-reg", user.universityRegisterNumber);
  set("profile-dob", user.dob);

  // Show department + year combined: "BCA 3rd Year"
  const deptYear = user.department && user.year
    ? `${user.department} ${user.year}`
    : "—";
  set("profile-dept-year", deptYear);

  set("profile-verified", user.isVerifiedStudent ? "Verified student ✅" : "Not verified");
}
