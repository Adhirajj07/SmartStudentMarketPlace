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
    window.location.href = "index.html";
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
    window.location.href = "index.html";
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
