// frontend/js/chat.js
// Seller's chat inbox — shows all conversations and allows real-time replies

initNav(); // from common.js

const currentUser = getCurrentUser();
const socket = io("http://localhost:5000");

let activeProductId = null;
let activeBuyerEmail = null;

socket.on("connect", () => {
  console.log("✅ Chat socket connected:", socket.id);
});

// -------------------------------------------------------
// Load all conversation threads for this user
// -------------------------------------------------------
async function loadInbox() {
  const body = document.getElementById("thread-list-body");
  body.innerHTML = '<p class="no-threads">Loading…</p>';

  try {
    const token = getToken();
    const response = await fetch(
      `http://localhost:5000/api/chat/inbox/${currentUser.email}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const threads = await response.json();

    if (!threads.length) {
      body.innerHTML = '<p class="no-threads">No conversations yet.<br>Buyers will appear here when they message you.</p>';
      return;
    }

    body.innerHTML = threads.map((thread) => `
      <div class="thread-item"
           data-product-id="${thread.productId}"
           data-buyer-email="${thread.buyerEmail}"
           data-product-name="${thread.productName}"
           data-buyer-name="${thread.buyerEmail.split("@")[0]}">
        <div class="thread-buyer">👤 ${thread.buyerEmail.split("@")[0]}</div>
        <div class="thread-product">📦 ${thread.productName}</div>
        <div class="thread-preview">${thread.lastMessage}</div>
      </div>
    `).join("");

    // Click a thread to open it
    body.querySelectorAll(".thread-item").forEach((item) => {
      item.addEventListener("click", () => {
        body.querySelectorAll(".thread-item").forEach((i) => i.classList.remove("active"));
        item.classList.add("active");

        const productId = item.getAttribute("data-product-id");
        const buyerEmail = item.getAttribute("data-buyer-email");
        const productName = item.getAttribute("data-product-name");
        const buyerName = item.getAttribute("data-buyer-name");

        openThread(productId, buyerEmail, productName, buyerName);
      });
    });

  } catch (err) {
    body.innerHTML = `<p class="no-threads">Could not load conversations: ${err.message}</p>`;
  }
}

// -------------------------------------------------------
// Open a specific chat thread
// -------------------------------------------------------
async function openThread(productId, buyerEmail, productName, buyerName) {
  // Leave previous room if any
  if (activeProductId && activeBuyerEmail) {
    socket.emit("leave_room", {
      productId: activeProductId,
      buyerEmail: activeBuyerEmail,
    });
  }

  activeProductId = productId;
  activeBuyerEmail = buyerEmail;

  // Update panel header
  document.getElementById("chat-panel-header").style.display = "flex";
  document.getElementById("panel-buyer-name").textContent = `👤 ${buyerName}`;
  document.getElementById("panel-product-name").textContent = `📦 ${productName}`;
  document.getElementById("chat-panel-form").style.display = "flex";

  // Join Socket.io room
  socket.emit("join_room", { productId, buyerEmail });

  // Load message history
  await loadThreadMessages(productId, buyerEmail);
}

// -------------------------------------------------------
// Load message history from MongoDB
// -------------------------------------------------------
async function loadThreadMessages(productId, buyerEmail) {
  const container = document.getElementById("chat-panel-messages");
  container.innerHTML = '<p class="muted small" style="padding:1rem;">Loading messages…</p>';

  try {
    const token = getToken();
    const response = await fetch(
      `http://localhost:5000/api/chat/${productId}/${buyerEmail}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const messages = await response.json();
    renderMessages(messages, container);
  } catch (err) {
    container.innerHTML = `<p class="muted small" style="padding:1rem;">Could not load messages: ${err.message}</p>`;
  }
}

// -------------------------------------------------------
// Render messages in the panel
// -------------------------------------------------------
function renderMessages(messages, container) {
  if (!messages.length) {
    container.innerHTML = '<p class="muted small" style="padding:1rem;">No messages yet.</p>';
    return;
  }

  container.innerHTML = messages.map((msg) => {
    const isMe = msg.senderEmail === currentUser.email;
    return `
      <div class="chat-message ${isMe ? "me" : "them"}">
        <div>${msg.text}</div>
        <div class="chat-meta">${isMe ? "You" : msg.senderName}</div>
      </div>
    `;
  }).join("");

  container.scrollTop = container.scrollHeight;
}

// -------------------------------------------------------
// Receive real-time message via Socket.io
// -------------------------------------------------------
socket.on("receive_message", (msg) => {
  // Only show if this message belongs to the active thread
  if (
    msg.productId !== activeProductId ||
    msg.buyerEmail !== activeBuyerEmail
  ) {
    // Refresh inbox to update preview
    loadInbox();
    return;
  }

  const container = document.getElementById("chat-panel-messages");
  const placeholder = container.querySelector("p");
  if (placeholder) placeholder.remove();

  const isMe = msg.senderEmail === currentUser.email;
  const div = document.createElement("div");
  div.className = `chat-message ${isMe ? "me" : "them"}`;
  div.innerHTML = `
    <div>${msg.text}</div>
    <div class="chat-meta">${isMe ? "You" : msg.senderName}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
});

// -------------------------------------------------------
// Send a reply via Socket.io
// -------------------------------------------------------
document.getElementById("chat-panel-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("panel-chat-input");
  const text = input.value.trim();
  if (!text || !activeProductId) return;

  socket.emit("send_message", {
    productId: activeProductId,
    buyerEmail: activeBuyerEmail,
    senderEmail: currentUser.email,
    senderName: currentUser.name || currentUser.email,
    text,
  });

  input.value = "";
});

// Load inbox on page load
loadInbox();
