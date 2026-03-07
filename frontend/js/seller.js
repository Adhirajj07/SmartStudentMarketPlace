// frontend/js/seller.js
// Seller profile page — shows reviews, review form, and seller's products

initNav();

const currentUser = getCurrentUser();

// Get seller email from URL: seller.html?email=xxx@college.edu
const params = new URLSearchParams(window.location.search);
const sellerEmail = params.get("email");

if (!sellerEmail) {
  document.body.innerHTML = '<p style="padding:2rem;color:#fca5a5;">No seller specified.</p>';
}

// -------------------------------------------------------
// Helper: render stars
// -------------------------------------------------------
function renderStars(rating) {
  const filled = Math.round(rating);
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

// -------------------------------------------------------
// Load seller info from their products
// -------------------------------------------------------
async function loadSellerInfo() {
  try {
    const allProducts = await fetchProducts();
    const sellerProducts = allProducts.filter(
      (p) => p.sellerEmail?.toLowerCase() === sellerEmail.toLowerCase()
    );

    if (sellerProducts.length > 0) {
      const p = sellerProducts[0];
      const firstName = p.sellerName.split(" ")[0];

      // Avatar initial
      document.getElementById("seller-avatar").textContent = firstName[0].toUpperCase();

      // Name
      document.getElementById("seller-display-name").textContent = p.sellerName;

      // Department
      if (p.sellerDepartment) {
        document.getElementById("seller-dept").textContent = `🎓 ${p.sellerDepartment}`;
      }

      // Render seller products
      renderSellerProducts(sellerProducts);
    } else {
      document.getElementById("seller-display-name").textContent = sellerEmail.split("@")[0];
      document.getElementById("seller-products").innerHTML =
        '<p class="muted small">No products listed by this seller.</p>';
    }
  } catch (err) {
    console.error("Seller info error:", err);
  }
}

// -------------------------------------------------------
// Render seller's product listings
// -------------------------------------------------------
function renderSellerProducts(products) {
  const container = document.getElementById("seller-products");
  if (!products.length) {
    container.innerHTML = '<p class="muted small">No products listed.</p>';
    return;
  }

  container.innerHTML = products.map((p) => `
    <article class="product-card">
      <div class="product-image-wrapper">
        <img src="${p.image}" alt="${p.name}" class="product-image" loading="lazy" />
        <span class="product-badge">${p.category}</span>
      </div>
      <div class="product-content">
        <h3 class="product-title">${p.name}</h3>
        <div class="price-row">
          <span class="suggested-price">₹${p.suggestedPrice}</span>
          <span class="original-price">₹${p.originalPrice}</span>
        </div>
      </div>
    </article>
  `).join("");
}

// -------------------------------------------------------
// Load reviews and update the profile card rating
// -------------------------------------------------------
async function loadReviews() {
  const listEl = document.getElementById("reviews-list");
  const headingEl = document.getElementById("reviews-heading");

  try {
    const { reviews, avgRating, totalReviews } = await fetchReviews(sellerEmail);

    // Update profile card stars
    if (avgRating) {
      document.getElementById("seller-stars").textContent = renderStars(avgRating);
      document.getElementById("seller-avg-num").textContent = avgRating;
      document.getElementById("seller-total-reviews").textContent = `(${totalReviews} review${totalReviews !== 1 ? "s" : ""})`;
    } else {
      document.getElementById("seller-total-reviews").textContent = "No reviews yet";
    }

    headingEl.textContent = `Reviews (${totalReviews})`;

    if (!reviews.length) {
      listEl.innerHTML = '<div class="no-reviews">⭐ No reviews yet.<br>Be the first to review this seller!</div>';
      return;
    }

    listEl.innerHTML = reviews.map((r) => `
      <div class="review-card">
        <div class="review-header">
          <span class="review-buyer">👤 ${r.reviewerName}</span>
          <span class="review-stars">${renderStars(r.rating)} ${r.rating}/5</span>
        </div>
        <p class="review-comment">"${r.comment}"</p>
        <div class="review-date">${new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
      </div>
    `).join("");
  } catch (err) {
    listEl.innerHTML = `<p class="muted small">Could not load reviews: ${err.message}</p>`;
  }
}

// -------------------------------------------------------
// Check if current user can review, then show form
// -------------------------------------------------------
async function initReviewForm() {
  const wrapper = document.getElementById("review-form-wrapper");

  // Don't show form if viewing own profile
  if (currentUser?.email?.toLowerCase() === sellerEmail.toLowerCase()) {
    return;
  }

  try {
    const { canReview, reason } = await checkCanReview(sellerEmail);

    if (!canReview) {
      wrapper.innerHTML = `
        <div class="cant-review-msg">
          ℹ️ ${reason}
        </div>
      `;
      return;
    }

    // Show the review form
    let selectedRating = 0;

    wrapper.innerHTML = `
      <div class="review-form-card">
        <h3>⭐ Leave a Review</h3>
        <div class="star-picker" id="star-picker">
          ${[1,2,3,4,5].map(n => `
            <button class="star-btn" data-star="${n}" title="${n} star${n>1?"s":""}">★</button>
          `).join("")}
        </div>
        <p id="star-label" style="font-size:0.8rem;color:#9ca3af;margin-bottom:0.7rem;">Click a star to rate</p>
        <textarea
          class="review-textarea"
          id="review-comment"
          placeholder="Share your experience… (max 30 characters)"
          maxlength="30"
        ></textarea>
        <div class="word-count" id="word-count">0 / 30 words</div>
        <div class="review-submit-row">
          <button class="primary-btn" id="submit-review-btn">Submit Review</button>
          <span id="review-msg" style="font-size:0.83rem;"></span>
        </div>
      </div>
    `;

    // Star picker interaction
    const starLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
    wrapper.querySelectorAll(".star-btn").forEach((btn) => {
      btn.addEventListener("mouseover", () => {
        const val = parseInt(btn.getAttribute("data-star"));
        wrapper.querySelectorAll(".star-btn").forEach((b) => {
          b.classList.toggle("active", parseInt(b.getAttribute("data-star")) <= val);
        });
      });
      btn.addEventListener("mouseleave", () => {
        wrapper.querySelectorAll(".star-btn").forEach((b) => {
          b.classList.toggle("active", parseInt(b.getAttribute("data-star")) <= selectedRating);
        });
      });
      btn.addEventListener("click", () => {
        selectedRating = parseInt(btn.getAttribute("data-star"));
        document.getElementById("star-label").textContent =
          `${starLabels[selectedRating]} — ${selectedRating}/5`;
        wrapper.querySelectorAll(".star-btn").forEach((b) => {
          b.classList.toggle("active", parseInt(b.getAttribute("data-star")) <= selectedRating);
        });
      });
    });

    // Word counter
    document.getElementById("review-comment").addEventListener("input", (e) => {
      const chars = e.target.value.length;
      const el = document.getElementById("word-count");
      el.textContent = chars + " / 30 characters";
      el.classList.toggle("over", chars > 30);
    });

    // Submit review
    document.getElementById("submit-review-btn").addEventListener("click", async () => {
      const comment = document.getElementById("review-comment").value.trim();
      const msgEl = document.getElementById("review-msg");
      msgEl.textContent = "";
      msgEl.style.color = "#fca5a5";

      if (!selectedRating) {
        msgEl.textContent = "Please select a star rating.";
        return;
      }
      if (!comment) {
        msgEl.textContent = "Please write a comment.";
        return;
      }
      if (comment.length > 30) {
        msgEl.textContent = "Too long! Use 30 characters or less (currently " + comment.length + ").";
        return;
      }

      try {
        await submitReview({ sellerEmail, rating: selectedRating, comment });
        msgEl.style.color = "#6ee7b7";
        msgEl.textContent = "✅ Review submitted!";
        // Refresh reviews and hide form, reload ratings
        setTimeout(() => {
          wrapper.innerHTML = '<div class="cant-review-msg">✅ You have already reviewed this seller. Thank you!</div>';
          loadReviews();
          loadSellerInfo();
        }, 1200);
      } catch (err) {
        msgEl.textContent = err.message;
      }
    });

  } catch (err) {
    console.error("Review form error:", err);
  }
}

// -------------------------------------------------------
// Boot
// -------------------------------------------------------
loadSellerInfo();
loadReviews();
initReviewForm();
