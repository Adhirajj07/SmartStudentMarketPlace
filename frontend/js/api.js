// frontend/js/api.js
// Central module for all communication with the backend API.
// Every fetch() call lives here — no API calls in app.js.

const BASE_URL = "https://smartstudentmarketplace.onrender.com/api";

// -------------------------------------------------------
// Helper: build headers (adds Authorization token if present)
// -------------------------------------------------------
function getHeaders(requiresAuth = false) {
  const headers = { "Content-Type": "application/json" };

  if (requiresAuth) {
    const token = localStorage.getItem("ssm_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

// -------------------------------------------------------
// Helper: handle response — throw a readable error on failure
// -------------------------------------------------------
async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    // Use the server's message if available, else a generic one
    throw new Error(data.message || "Something went wrong.");
  }
  return data;
}

// -------------------------------------------------------
// AUTH APIs
// -------------------------------------------------------

/**
 * POST /api/auth/register
 * Register a new student. Returns user info + JWT token.
 */
async function registerUser(payload) {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

/**
 * POST /api/auth/login
 * Log in with email and password. Returns user info + JWT token.
 */
async function loginUser(email, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(response);
}

/**
 * POST /api/auth/complete-profile
 * Create user account with full details after Google sign-in.
 */
async function updateUserProfile(payload) {
  const response = await fetch(`${BASE_URL}/auth/complete-profile`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

// -------------------------------------------------------
// PRODUCT APIs
// -------------------------------------------------------

/**
 * GET /api/products
 * Fetch all products. Pass a category string to filter.
 * Example: fetchProducts("Books") or fetchProducts("all")
 */
async function fetchProducts(category = "all") {
  const query =
    category && category !== "all" ? `?category=${category}` : "";
  const response = await fetch(`${BASE_URL}/products${query}`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * POST /api/products
 * Add a new product listing. Requires login (sends JWT).
 */
async function createProduct(productData) {
  const response = await fetch(`${BASE_URL}/products`, {
    method: "POST",
    headers: getHeaders(true), // true = include Authorization header
    body: JSON.stringify(productData),
  });
  return handleResponse(response);
}

/**
 * PUT /api/products/:id
 * Update a product by ID. Only the seller can update their own.
 */
async function updateProduct(productId, productData) {
  const response = await fetch(`${BASE_URL}/products/${productId}`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(productData),
  });
  return handleResponse(response);
}

/**
 * DELETE /api/products/:id
 * Delete a product by ID. Only the seller can delete their own.
 */
async function deleteProduct(productId) {
  const response = await fetch(`${BASE_URL}/products/${productId}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  return handleResponse(response);
}

// -------------------------------------------------------
// REVIEW APIs
// -------------------------------------------------------

/**
 * GET /api/reviews/:sellerEmail
 * Fetch all reviews + average rating for a seller
 */
async function fetchReviews(sellerEmail) {
  const response = await fetch(`${BASE_URL}/reviews/${sellerEmail}`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
}

/**
 * POST /api/reviews
 * Submit a review for a seller
 */
async function submitReview(payload) {
  const response = await fetch(`${BASE_URL}/reviews`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

/**
 * GET /api/reviews/can-review/:sellerEmail
 * Check if logged-in user can review this seller
 */
async function checkCanReview(sellerEmail) {
  const response = await fetch(`${BASE_URL}/reviews/can-review/${sellerEmail}`, {
    method: "GET",
    headers: getHeaders(true),
  });
  return handleResponse(response);
}
