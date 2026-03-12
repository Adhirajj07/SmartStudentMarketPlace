// frontend/js/community.js

requireLogin();
initNav();

const currentUser = getCurrentUser();
const token = localStorage.getItem("ssm_token");
const BASE = "https://smartstudentmarketplace.onrender.com";

const container = document.getElementById("messages-container");
const input = document.getElementById("community-input");
const sendBtn = document.getElementById("send-btn");
const statusEl = document.getElementById("input-status");

// Socket.io
clearUnread("community"); // User is on community page
const socket = io(BASE);
socket.emit("community_join");

// -------------------------------------------------------
// Pinned Admin Message (always shown at top)
// -------------------------------------------------------
const PINNED_ADMIN_MESSAGE = `
  <div class="msg-bubble pinned-admin-msg" id="pinned-admin">
    <div class="msg-avatar admin-avatar">📢</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-name admin-name">🛡️ Admin</span>
        <span class="msg-dept">SSM Team</span>
        <span class="pinned-badge">📌 Pinned</span>
      </div>
      <div class="msg-text">
        <strong>Welcome to the SSM Community! 👋</strong><br><br>
        This space is created for students to connect and support each other — especially for important needs like finding a <strong>scribe for exams</strong>. 📝<br><br>
        ✅ You can post here to request or offer help as a scribe for university exams.<br>
        ✅ Share study resources, notes, or academic help.<br>
        ✅ Ask questions about college services and facilities.<br><br>
        <em>Please be respectful. All messages are AI-moderated.If the Message is Inappropriate AI will detect and show the message is Inappropriate . Messages auto-delete after 2 hours.</em>
      </div>
    </div>
  </div>
`;

function renderPinnedMessage() {
  // Remove existing pinned message if present
  const existing = document.getElementById("pinned-admin");
  if (existing) existing.remove();

  // Insert at the very top of container
  container.insertAdjacentHTML("afterbegin", PINNED_ADMIN_MESSAGE);
}

// -------------------------------------------------------
// Render a single message bubble
// -------------------------------------------------------
function renderMessage(msg) {
  if (msg.deleted) {
    return `<div class="msg-bubble" id="msg-${msg._id}">
      <p class="deleted-msg">🚫 This message was deleted.</p>
    </div>`;
  }

  const isOwn = msg.senderEmail === currentUser?.email?.toLowerCase();
  const initial = (msg.senderName || "?")[0].toUpperCase();
  const time = new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const liked = msg.likes?.includes(currentUser?.email?.toLowerCase());
  const likeCount = msg.likes?.length || 0;

  return `
    <div class="msg-bubble ${isOwn ? "own" : ""}" id="msg-${msg._id}">
      <div class="msg-avatar">${initial}</div>
      <div class="msg-body">
        <div class="msg-meta">
          <span class="msg-name">${msg.senderName}</span>
          ${msg.senderDept ? `<span class="msg-dept">${msg.senderDept}</span>` : ""}
          <span class="msg-time">${time}</span>
        </div>
        <div class="msg-text">${escapeHtml(msg.text)}</div>
        <div class="msg-actions">
          <button class="like-btn ${liked ? "liked" : ""}" data-like-id="${msg._id}">
            ${liked ? "❤️" : "🤍"} ${likeCount > 0 ? likeCount : ""}
          </button>
          ${isOwn ? `<button class="delete-btn" data-delete-id="${msg._id}" title="Delete">🗑️</button>` : ""}
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// -------------------------------------------------------
// Load messages from server
// -------------------------------------------------------
async function loadMessages() {
  try {
    const response = await fetch(`${BASE}/api/community`, {
      headers: { "Authorization": "Bearer " + token }
    });
    const messages = await response.json();

    if (!messages.length) {
      container.innerHTML = `
        <div class="empty-community">
          <div class="emoji">💬</div>
          <p>No messages yet. Be the first to say something!</p>
        </div>`;
    } else {
      container.innerHTML = messages.map(renderMessage).join("");
      scrollToBottom();
    }

    // Always render pinned message at top (after setting content)
    renderPinnedMessage();

  } catch (err) {
    container.innerHTML = `<p class="muted small" style="padding:1rem;">Could not load messages.</p>`;
    renderPinnedMessage();
  }
}

function scrollToBottom() {
  container.scrollTop = container.scrollHeight;
}

// -------------------------------------------------------
// AI moderation check via backend
// -------------------------------------------------------
async function checkMessageSafety(text) {
  try {
    const response = await fetch(`${BASE}/api/ai-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
      },
      body: JSON.stringify({
        name: "Community message",
        description: text,
        category: "Community"
      })
    });
    return await response.json();
  } catch (e) {
    return { allowed: true }; // fail open if AI unavailable
  }
}

// -------------------------------------------------------
// Send message
// -------------------------------------------------------
async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  statusEl.textContent = "";
  sendBtn.disabled = true;
  sendBtn.textContent = "⏳";

  // AI moderation check
  const aiResult = await checkMessageSafety(text);
  if (!aiResult.allowed) {
    statusEl.textContent = "🚫 Message blocked: " + (aiResult.reason || "Inappropriate content.");
    sendBtn.disabled = false;
    sendBtn.textContent = "➤";
    return;
  }

  try {
    const response = await fetch(`${BASE}/api/community`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const err = await response.json();
      statusEl.textContent = err.message;
      return;
    }

    const msg = await response.json();
    input.value = "";
    input.style.height = "auto";

    // Broadcast via socket to all users
    socket.emit("community_message", msg);

    // Add to own screen immediately
    appendMessage(msg);
    scrollToBottom();

  } catch (err) {
    statusEl.textContent = "Could not send message.";
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "➤";
  }
}

function appendMessage(msg) {
  // Remove empty state if present
  const empty = container.querySelector(".empty-community");
  if (empty) empty.remove();

  const div = document.createElement("div");
  div.innerHTML = renderMessage(msg);
  container.appendChild(div.firstElementChild);

  // Keep pinned message at top always
  renderPinnedMessage();
}

// -------------------------------------------------------
// Socket listeners
// -------------------------------------------------------
socket.on("community_message", (msg) => {
  // Don't double-add own messages
  if (msg.senderEmail === currentUser?.email?.toLowerCase()) return;
  if (document.getElementById("msg-" + msg._id)) return;
  appendMessage(msg);
  scrollToBottom();
  // Set unread dot on other pages
  setUnread("community");
});

socket.on("community_like", ({ msgId, likes, liked, likerEmail }) => {
  const bubble = document.getElementById("msg-" + msgId);
  if (!bubble) return;
  const btn = bubble.querySelector(".like-btn");
  if (!btn) return;
  const isMe = likerEmail === currentUser?.email?.toLowerCase();
  btn.className = "like-btn" + (isMe && liked ? " liked" : "");
  btn.innerHTML = (isMe && liked ? "❤️" : "🤍") + (likes > 0 ? " " + likes : "");
});

socket.on("community_delete", ({ msgId }) => {
  const bubble = document.getElementById("msg-" + msgId);
  if (bubble) {
    bubble.innerHTML = '<p class="deleted-msg">🚫 This message was deleted.</p>';
  }
});

// -------------------------------------------------------
// Click delegation — like + delete
// -------------------------------------------------------
container.addEventListener("click", async (e) => {
  // Like button
  const likeBtn = e.target.closest("[data-like-id]");
  if (likeBtn) {
    const msgId = likeBtn.getAttribute("data-like-id");
    try {
      const response = await fetch(`${BASE}/api/community/${msgId}/like`, {
        method: "POST",
        headers: { "Authorization": "Bearer " + token }
      });
      const data = await response.json();
      // Update button immediately
      likeBtn.className = "like-btn" + (data.liked ? " liked" : "");
      likeBtn.innerHTML = (data.liked ? "❤️" : "🤍") + (data.likes > 0 ? " " + data.likes : "");
      // Broadcast like update
      socket.emit("community_like", {
        msgId,
        likes: data.likes,
        liked: data.liked,
        likerEmail: currentUser?.email?.toLowerCase()
      });
    } catch (err) {}
    return;
  }

  // Delete button
  const deleteBtn = e.target.closest("[data-delete-id]");
  if (deleteBtn) {
    const msgId = deleteBtn.getAttribute("data-delete-id");
    if (!confirm("Delete this message?")) return;
    try {
      await fetch(`${BASE}/api/community/${msgId}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
      });
      // Update own screen
      const bubble = document.getElementById("msg-" + msgId);
      if (bubble) bubble.innerHTML = '<p class="deleted-msg">🚫 This message was deleted.</p>';
      // Broadcast deletion
      socket.emit("community_delete", { msgId });
    } catch (err) {}
  }
});

// -------------------------------------------------------
// Send on Enter (Shift+Enter for newline)
// -------------------------------------------------------
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 100) + "px";
  statusEl.textContent = "";
});

sendBtn.addEventListener("click", sendMessage);

// -------------------------------------------------------
// Boot
// -------------------------------------------------------
loadMessages();