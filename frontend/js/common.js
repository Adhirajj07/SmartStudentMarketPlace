// frontend/js/common.js
// Shared helpers used on every page (buy, sell, profile)

function getToken() {
  return localStorage.getItem("ssm_token");
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("ssm_current_user") || "null");
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem("ssm_token");
  localStorage.removeItem("ssm_current_user");
}

// Redirect to login if not logged in
function requireLogin() {
  if (!getToken() || !getCurrentUser()) {
    window.location.href = "../index.html";
  }
}

// Setup nav user display and logout button
function initNav() {
  requireLogin();

  const user = getCurrentUser();
  const userEl = document.getElementById("current-user-email");
  if (userEl && user) {
    userEl.textContent = user.name ? `${user.name} · ${user.email}` : user.email;
  }

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    clearSession();
    window.location.href = "../index.html";
  });
}

// Chat helpers (shared between buy and sell pages)
function getChats() {
  try {
    return JSON.parse(localStorage.getItem("ssm_chats") || "{}");
  } catch { return {}; }
}

function setChats(chats) {
  localStorage.setItem("ssm_chats", JSON.stringify(chats));
}

function getChatThread(productId, buyerEmail) {
  return getChats()[`${productId}::${buyerEmail}`] || [];
}

function setChatThread(productId, buyerEmail, messages) {
  const chats = getChats();
  chats[`${productId}::${buyerEmail}`] = messages;
  setChats(chats);
}

function renderChatMessages(messages, currentUserEmail) {
  const container = document.getElementById("chat-messages");
  if (!container) return;

  if (!messages.length) {
    container.innerHTML = '<p class="muted small">Start a conversation with the seller.</p>';
    return;
  }

  container.innerHTML = messages.map((msg) => {
    const side = msg.sender === currentUserEmail ? "me" : "them";
    return `
      <div class="chat-message ${side}">
        <div>${msg.text}</div>
        <div class="chat-meta">${side === "me" ? "You" : "Seller"}</div>
      </div>
    `;
  }).join("");

  container.scrollTop = container.scrollHeight;
}

// -------------------------------------------------------
// Unread notification dots for Chats and Community
// -------------------------------------------------------

// Mark a section as having unread messages
function setUnread(section) {
  localStorage.setItem("ssm_unread_" + section, "1");
  updateNavDots();
}

// Clear unread for a section (called when user visits that page)
function clearUnread(section) {
  localStorage.removeItem("ssm_unread_" + section);
  updateNavDots();
}

// Show/hide red dots on nav links
function updateNavDots() {
  const chatUnread = localStorage.getItem("ssm_unread_chat") === "1";
  const communityUnread = localStorage.getItem("ssm_unread_community") === "1";

  // Find nav buttons by their text content
  document.querySelectorAll(".nav-link").forEach(btn => {
    const text = btn.textContent.trim();

    if (text.includes("Chats")) {
      // Remove existing dot
      btn.querySelector(".nav-dot")?.remove();
      if (chatUnread) {
        const dot = document.createElement("span");
        dot.className = "nav-dot";
        btn.appendChild(dot);
      }
    }

    if (text.includes("Community")) {
      btn.querySelector(".nav-dot")?.remove();
      if (communityUnread) {
        const dot = document.createElement("span");
        dot.className = "nav-dot";
        btn.appendChild(dot);
      }
    }
  });
}

// Call on every page load to show existing unread dots
document.addEventListener("DOMContentLoaded", updateNavDots);

// -------------------------------------------------------
// Theme toggle — dark / light
// -------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem("ssm_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateToggleBtn(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("ssm_theme", next);
  updateToggleBtn(next);
}

function updateToggleBtn(theme) {
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) {
    btn.textContent = theme === "dark" ? "☀️" : "🌙";
    btn.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  }
}

// Init theme immediately on load (before render to avoid flash)
initTheme();
