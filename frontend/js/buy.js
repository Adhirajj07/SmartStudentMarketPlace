// frontend/js/buy.js
// Buy page logic with real-time Socket.io chat

initNav(); // from common.js

const currentUser = getCurrentUser();
let activeChatProductId = null;
let activeBuyerEmail = null;

// Show user's first name in the hero greeting
const greetingEl = document.getElementById("user-greeting-name");
if (greetingEl && currentUser?.name) {
  greetingEl.textContent = currentUser.name.split(" ")[0]; // First name only
}

// Connect to Socket.io server
const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("✅ Connected to chat server:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err.message);
});

// -------------------------------------------------------
// Load and render products
// -------------------------------------------------------
async function loadProducts() {
  const grid = document.getElementById("products-grid");
  const category = document.getElementById("category-filter")?.value || "all";
  grid.innerHTML = '<p class="muted small">Loading products…</p>';

  let products = [];
  try {
    const products = await fetchProducts(category);

    if (!products.length) {
      grid.innerHTML = '<p class="muted small">No products in this category yet.</p>';
      return;
    }

    grid.innerHTML = products.map((product) => {
      const isOwner = currentUser?.email?.toLowerCase() === product.sellerEmail?.toLowerCase();
      return `
        <article class="product-card">
          <div class="product-image-wrapper">
            <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy" />
            <span class="product-badge">${product.category}</span>
            ${isOwner ? `
              <div class="product-actions">
                <button class="danger-btn" data-delete-id="${product._id}">Delete</button>
              </div>` : ""}
          </div>
          <div class="product-content">
            <h3 class="product-title">${product.name}</h3>
            <div class="price-row">
              <span class="suggested-price">₹${product.suggestedPrice}</span>
              <span class="original-price">₹${product.originalPrice}</span>
            </div>
            <div class="seller-row">
              <div class="seller-info">
                <a class="seller-name seller-link" href="seller.html?email=${encodeURIComponent(product.sellerEmail)}">${product.sellerName}</a>
                <span class="seller-rating" style="color:#a5b4fc;font-size:0.74rem;">${product.sellerDepartment || ""}</span>
                <span class="seller-rating" id="rating-${product._id}" style="color:#6b7280;">0 reviews</span>
              </div>
              ${!isOwner ? `
                <button class="chat-btn" data-chat-id="${product._id}" data-seller="${product.sellerName}" data-seller-email="${product.sellerEmail}">
                  <span>💬</span><span>Chat</span>
                </button>` : ""}
            </div>
          </div>
        </article>
      `;
    }).join("");
  } catch (err) {
    grid.innerHTML = `<p class="muted small">Could not load products: ${err.message}</p>`;
    return;
  }

  // Get unique seller emails
  const uniqueSellerEmails = [...new Set(products.map(p => p.sellerEmail))];

  // Fetch all seller ratings in parallel
  const ratingMap = {};
  await Promise.all(uniqueSellerEmails.map(async (email) => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/reviews/" + encodeURIComponent(email)
      );
      if (!response.ok) return;
      const data = await response.json();
      ratingMap[email.toLowerCase()] = data;
    } catch (e) {}
  }));

  // Update every product card with the seller's rating
  products.forEach(product => {
    const el = document.getElementById("rating-" + product._id);
    if (!el) return;

    const data = ratingMap[product.sellerEmail?.toLowerCase()];
    let stars = "";

    if (data && data.totalReviews > 0) {
      el.textContent = "⭐ " + data.totalReviews + " review" + (data.totalReviews > 1 ? "s" : "");
      el.style.color = "#fde68a";
    } else {
      el.textContent = "0 reviews";
      el.style.color = "#6b7280";
    }
  });
}

// Category filter
document.getElementById("category-filter")?.addEventListener("change", loadProducts);

// Click delegation on product grid
document.getElementById("products-grid")?.addEventListener("click", async (e) => {
  // Delete button
  const deleteBtn = e.target.closest("[data-delete-id]");
  if (deleteBtn) {
    const id = deleteBtn.getAttribute("data-delete-id");
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    try {
      await deleteProduct(id);
      loadProducts();
    } catch (err) {
      alert(`Could not delete: ${err.message}`);
    }
    return;
  }

  // Chat button
  const chatBtn = e.target.closest("[data-chat-id]");
  if (chatBtn) {
    const productId = chatBtn.getAttribute("data-chat-id");
    const sellerName = chatBtn.getAttribute("data-seller");
    openChat(productId, sellerName);
  }
});

// -------------------------------------------------------
// REAL-TIME CHAT
// -------------------------------------------------------

// Open chat popup and join the Socket.io room
async function openChat(productId, sellerName) {
  if (!currentUser) return;

  activeChatProductId = productId;
  activeBuyerEmail = currentUser.email;

  // Update chat header
  const products = await fetchProducts();
  const product = products.find((p) => p._id === productId);
  if (!product) return;

  document.getElementById("chat-product-name").textContent = product.name;
  document.getElementById("chat-seller-name").textContent = `Seller: ${product.sellerName}`;

  // Join the Socket.io room for this product + buyer
  socket.emit("join_room", {
    productId,
    buyerEmail: currentUser.email,
  });

  // Load existing message history from MongoDB
  await loadChatHistory(productId, currentUser.email);

  // Show the chat overlay
  document.getElementById("chat-overlay").classList.remove("hidden");
}

// Fetch past messages from the backend
async function loadChatHistory(productId, buyerEmail) {
  const container = document.getElementById("chat-messages");
  container.innerHTML = '<p class="muted small">Loading messages…</p>';

  try {
    const token = getToken();
    const response = await fetch(
      `http://localhost:5000/api/chat/${productId}/${buyerEmail}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const messages = await response.json();
    renderMessages(messages);
  } catch (err) {
    container.innerHTML = '<p class="muted small">Could not load messages.</p>';
  }
}

// Render messages in the chat window
function renderMessages(messages) {
  const container = document.getElementById("chat-messages");

  if (!messages.length) {
    container.innerHTML = '<p class="muted small">No messages yet. Say hello! 👋</p>';
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

// Receive real-time message from Socket.io
socket.on("receive_message", (msg) => {
  const container = document.getElementById("chat-messages");

  // Remove "no messages" placeholder if present
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

// Send message via Socket.io
document.getElementById("chat-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text || !activeChatProductId) return;

  // Emit the message to the server
  socket.emit("send_message", {
    productId: activeChatProductId,
    buyerEmail: activeBuyerEmail,
    senderEmail: currentUser.email,
    senderName: currentUser.name || currentUser.email,
    text,
  });

  input.value = "";
});

// Close chat
document.getElementById("chat-close")?.addEventListener("click", () => {
  activeChatProductId = null;
  activeBuyerEmail = null;
  document.getElementById("chat-overlay").classList.add("hidden");
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    activeChatProductId = null;
    document.getElementById("chat-overlay")?.classList.add("hidden");
  }
});

// Load products on page load
loadProducts();
