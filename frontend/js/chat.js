// frontend/js/chat.js
// Chat page — works for both buyers and sellers

initNav();
clearUnread("chat");

const currentUser = getCurrentUser();
const socket = io("https://ssm-backend-upny.onrender.com");

let activeProductId = null;
let activeBuyerEmail = null;

socket.on("connect", () => {
  console.log("✅ Chat socket connected:", socket.id);
});

// -------------------------------------------------------
// Load all conversation threads for this user
// (threads where they are buyer OR seller)
// -------------------------------------------------------
async function loadInbox() {
  const body = document.getElementById("thread-list-body");
  body.innerHTML = '<p class="no-threads">Loading…</p>';

  try {
    const token = getToken();

    // Fetch threads where user is seller
    const sellerRes = await fetch(
      `https://ssm-backend-upny.onrender.com/api/chat/inbox/${currentUser.email}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const sellerThreads = await sellerRes.json();

    // Fetch threads where user is buyer
    const buyerRes = await fetch(
      `https://ssm-backend-upny.onrender.com/api/chat/buyer-inbox/${currentUser.email}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const buyerThreads = await buyerRes.json();

    // Merge and deduplicate by productId + buyerEmail
    const seen = new Set();
    const allThreads = [...sellerThreads, ...buyerThreads].filter(thread => {
      const key = `${thread.productId}::${thread.buyerEmail}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by latest message
    allThreads.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    if (!allThreads.length) {
      body.innerHTML = '<p class="no-threads">No conversations yet.<br>Chat with a seller from the Buy page!</p>';
      return;
    }

    body.innerHTML = allThreads.map((thread) => {
      const isMe = thread.buyerEmail === currentUser.email;
      const otherPerson = isMe ? thread.sellerEmail?.split("@")[0] : thread.buyerEmail?.split("@")[0];
      return `
        <div class="thread-item"
             data-product-id="${thread.productId}"
             data-buyer-email="${thread.buyerEmail}"
             data-product-name="${thread.productName}"
             data-other-person="${otherPerson}">
          <div class="thread-buyer">👤 ${otherPerson}</div>
          <div class="thread-product">📦 ${thread.productName}</div>
          <div class="thread-preview">${thread.lastMessage}</div>
        </div>
      `;
    }).join("");

    // Click a thread to open it
    body.querySelectorAll(".thread-item").forEach((item) => {
      item.addEventListener("click", () => {
        body.querySelectorAll(".thread-item").forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
        openThread(
          item.getAttribute("data-product-id"),
          item.getAttribute("data-buyer-email"),
          item.getAttribute("data-product-name"),
          item.getAttribute("data-other-person")
        );
      });
    });

    // Highlight matching thread in sidebar if coming from buy.html
    const _params = new URLSearchParams(window.location.search);
    const _paramProductId = _params.get("productId");
    const _buyerEmail = currentUser.email;
    if (_paramProductId) {
      const matchingItem = body.querySelector(`[data-product-id="${_paramProductId}"][data-buyer-email="${_buyerEmail}"]`);
      if (matchingItem) matchingItem.classList.add("active");
    }

  } catch (err) {
    body.innerHTML = `<p class="no-threads">Could not load conversations: ${err.message}</p>`;
  }
}

// -------------------------------------------------------
// Open a specific chat thread
// -------------------------------------------------------
async function openThread(productId, buyerEmail, productName, otherPersonName) {
  if (activeProductId && activeBuyerEmail) {
    socket.emit("leave_room", { productId: activeProductId, buyerEmail: activeBuyerEmail });
  }

  activeProductId = productId;
  activeBuyerEmail = buyerEmail.toLowerCase();

  document.getElementById("chat-panel-header").style.display = "flex";
  document.getElementById("panel-buyer-name").textContent = `👤 ${otherPersonName}`;
  document.getElementById("panel-product-name").textContent = `📦 ${productName} • ⭐ Click seller name on Buy page to leave a review`;
  document.getElementById("chat-panel-form").style.display = "flex";

  socket.emit("join_room", { productId, buyerEmail });

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
      `https://ssm-backend-upny.onrender.com/api/chat/${productId}/${buyerEmail}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const messages = await response.json();
    renderMessages(messages, container);
  } catch (err) {
    container.innerHTML = `<p class="muted small" style="padding:1rem;">Could not load messages: ${err.message}</p>`;
  }
}

// -------------------------------------------------------
// Render messages
// -------------------------------------------------------
function renderMessages(messages, container) {
  if (!messages.length) {
    container.innerHTML = '<p class="muted small" style="padding:1rem;">No messages yet. Say hello! 👋</p>';
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
// Receive real-time message
// -------------------------------------------------------
socket.on("receive_message", (msg) => {
  if (msg.productId !== activeProductId || msg.buyerEmail.toLowerCase() !== activeBuyerEmail) {
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
// Send a message
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

// Auto-open thread from URL params immediately, without waiting for inbox
(function openThreadFromParams() {
  const params = new URLSearchParams(window.location.search);
  const paramProductId = params.get("productId");
  const paramSellerEmail = params.get("sellerEmail");
  const paramProductName = params.get("productName");

  if (paramProductId && paramSellerEmail) {
    openThread(
      paramProductId,
      currentUser.email,
      decodeURIComponent(paramProductName || "Product"),
      paramSellerEmail.split("@")[0]
    );
  }
})();