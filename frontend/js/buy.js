// frontend/js/buy.js
// Buy page logic — chat button redirects to chat.html

initNav(); // from common.js

const currentUser = getCurrentUser();

// Show user's first name in the hero greeting
const greetingEl = document.getElementById("user-greeting-name");
if (greetingEl && currentUser?.name) {
  greetingEl.textContent = currentUser.name.split(" ")[0];
}

// -------------------------------------------------------
// Load and render products
// -------------------------------------------------------
async function loadProducts() {
  const grid = document.getElementById("products-grid");
  const category = document.getElementById("category-filter")?.value || "all";
  grid.innerHTML = '<p class="muted small">Loading products…</p>';

  let products = [];
  try {
    products = await fetchProducts(category);

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
                <button class="chat-btn"
                  data-chat-id="${product._id}"
                  data-seller-email="${product.sellerEmail}"
                  data-seller-name="${product.sellerName}"
                  data-product-name="${product.name}">
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

  // Fetch seller ratings
  const uniqueSellerEmails = [...new Set(products.map(p => p.sellerEmail).filter(Boolean))];
  const ratingMap = {};
  await Promise.all(uniqueSellerEmails.map(async (email) => {
    try {
      const response = await fetch("http://localhost:5000/api/reviews/" + encodeURIComponent(email));
      const data = await response.json();
      ratingMap[email.toLowerCase()] = data;
    } catch (e) {}
  }));

  products.forEach(product => {
    const el = document.getElementById("rating-" + product._id);
    if (!el) return;
    const data = ratingMap[product.sellerEmail?.toLowerCase()];
    if (data && data.totalReviews > 0) {
      el.textContent = "⭐ " + data.totalReviews + (data.totalReviews === 1 ? " review" : " reviews");
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

  // Chat button — redirect to chat.html with query params
  const chatBtn = e.target.closest("[data-chat-id]");
  if (chatBtn) {
    const productId = chatBtn.getAttribute("data-chat-id");
    const sellerEmail = chatBtn.getAttribute("data-seller-email");
    const productName = chatBtn.getAttribute("data-product-name");
    location.href = `chat.html?productId=${productId}&sellerEmail=${encodeURIComponent(sellerEmail)}&productName=${encodeURIComponent(productName)}`;
  }
});

// Load products on page load
loadProducts();
