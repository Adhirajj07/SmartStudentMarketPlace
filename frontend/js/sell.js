// frontend/js/sell.js
// Logic for sell.html — add product form and my listings

initNav(); // from common.js

const user = getCurrentUser();

// Prefill seller name
const sellerInput = document.getElementById("sell-seller");
if (sellerInput && user) {
  sellerInput.value = user.name ? `${user.name} (Verified student)` : user.email;
}

// Load this user's listings
async function loadMyListings() {
  const container = document.getElementById("my-listings");
  if (!container || !user) return;

  container.innerHTML = '<p class="muted small">Loading your listings…</p>';

  let mine = [];
  try {
    const all = await fetchProducts();
    mine = all.filter(
      (p) => p.sellerEmail?.toLowerCase() === user.email?.toLowerCase()
    );

    if (!mine.length) {
      container.innerHTML = '<p class="muted small">No listings yet. Add a product above.</p>';
      return;
    }

    container.innerHTML = mine.map((product) => `
      <article class="product-card">
        <div class="product-image-wrapper">
          <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy" />
          <span class="product-badge">${product.category}</span>
          <div class="product-actions">
            <button class="danger-btn" data-delete-id="${product._id}">Delete</button>
          </div>
        </div>
        <div class="product-content">
          <h3 class="product-title">${product.name}</h3>
          <div class="price-row">
            <span class="suggested-price">₹${product.suggestedPrice}</span>
            <span class="original-price">₹${product.originalPrice}</span>
          </div>
          <div class="seller-row">
            <div class="seller-info">
              <span class="seller-name">${product.sellerName}</span>
              <span class="seller-rating" id="my-rating-${product._id}">Loading…</span>
            </div>
          </div>
        </div>
      </article>
    `).join("");
  } catch (err) {
    container.innerHTML = `<p class="muted small">Could not load listings: ${err.message}</p>`;
    return;
  }

  // Load review count for seller
  try {
    const response = await fetch("https://ssm-backend-upny.onrender.com/api/reviews/" + encodeURIComponent(user.email));
    const data = await response.json();
    mine.forEach(product => {
      const el = document.getElementById("my-rating-" + product._id);
      if (el) {
        if (data.totalReviews > 0) {
          el.textContent = "⭐ " + data.totalReviews + (data.totalReviews === 1 ? " review" : " reviews");
          el.style.color = "#fde68a";
        } else {
          el.textContent = "0 reviews";
          el.style.color = "#6b7280";
        }
      }
    });
  } catch (e) {}
}

// Delete from my listings
document.getElementById("my-listings")?.addEventListener("click", async (e) => {
  const deleteBtn = e.target.closest("[data-delete-id]");
  if (!deleteBtn) return;
  const id = deleteBtn.getAttribute("data-delete-id");
  if (!confirm("Delete this listing? This cannot be undone.")) return;
  try {
    await deleteProduct(id);
    loadMyListings();
  } catch (err) {
    alert(`Could not delete: ${err.message}`);
  }
});

// -------------------------------------------------------
// AI product safety check — calls our backend which calls Claude
// -------------------------------------------------------
async function checkProductWithAI(name, description, category) {
  const token = localStorage.getItem("ssm_token");
  const response = await fetch("https://ssm-backend-upny.onrender.com/api/ai-check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token,
    },
    body: JSON.stringify({ name, description, category }),
  });
  return await response.json();
}

// Sell form submit
document.getElementById("sell-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("sell-error");
  const successEl = document.getElementById("sell-success");
  const checkingEl = document.getElementById("sell-ai-checking");
  const submitBtn = document.querySelector("#sell-form .primary-btn");

  errorEl.textContent = "";
  successEl.textContent = "";

  const name = document.getElementById("sell-name").value.trim();
  const description = document.getElementById("sell-description").value.trim();
  const category = document.getElementById("sell-category").value;

  // Show AI checking state
  checkingEl.style.display = "block";
  submitBtn.disabled = true;
  submitBtn.textContent = "Checking…";

  try {
    // Step 1 — AI safety check
    const aiResult = await checkProductWithAI(name, description, category);

    checkingEl.style.display = "none";

    if (!aiResult.allowed) {
      errorEl.textContent = "🚫 Listing blocked: " + aiResult.reason;
      submitBtn.disabled = false;
      submitBtn.textContent = "Add product";
      return;
    }

    // Step 2 — AI approved, create the product
    await createProduct({
      name,
      description,
      category,
      suggestedPrice: document.getElementById("sell-suggested-price").value,
      originalPrice: document.getElementById("sell-original-price").value,
      image: document.getElementById("sell-image").value,
    });

    successEl.textContent = "✅ Product listed successfully!";
    document.getElementById("sell-form").reset();
    if (sellerInput && user) {
      sellerInput.value = user.name ? `${user.name} (Verified student)` : user.email;
    }
    loadMyListings();
  } catch (err) {
    checkingEl.style.display = "none";
    errorEl.textContent = err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add product";
  }
});

// Clear button
document.getElementById("sell-clear")?.addEventListener("click", () => {
  document.getElementById("sell-form").reset();
  if (sellerInput && user) {
    sellerInput.value = user.name ? `${user.name} (Verified student)` : user.email;
  }
  document.getElementById("sell-error").textContent = "";
  document.getElementById("sell-success").textContent = "";
});

loadMyListings();
