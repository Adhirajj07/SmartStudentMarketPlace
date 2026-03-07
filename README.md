# Smart Student Marketplace — Full-Stack

A campus-only student marketplace converted from a localStorage-only frontend
into a full-stack application with a Node.js + Express backend and MongoDB database.

---

## Folder Structure

```
ssm-fullstack/
│
├── backend/                        ← Node.js + Express server
│   ├── config/
│   │   └── db.js                   ← MongoDB connection setup
│   ├── middleware/
│   │   └── authMiddleware.js       ← JWT token verification
│   ├── models/
│   │   ├── User.js                 ← User schema (Mongoose)
│   │   └── Product.js              ← Product schema (Mongoose)
│   ├── routes/
│   │   ├── authRoutes.js           ← POST /api/auth/register & /login
│   │   └── productRoutes.js        ← GET/POST/PUT/DELETE /api/products
│   ├── .env                        ← Environment variables (never commit this!)
│   ├── package.json
│   └── server.js                   ← App entry point
│
└── frontend/                       ← Plain HTML/CSS/JS
    ├── css/
    │   └── styles.css
    ├── js/
    │   ├── api.js                  ← All fetch() calls to the backend
    │   └── app.js                  ← UI logic (no more localStorage for data)
    └── index.html
```

---

## Prerequisites

Make sure you have these installed:

| Tool       | Version  | Download                         |
|------------|----------|----------------------------------|
| Node.js    | v18+     | https://nodejs.org               |
| npm        | v9+      | Comes with Node.js               |
| MongoDB    | v6+      | https://www.mongodb.com/try/download/community |

> **Tip:** You can also use [MongoDB Atlas](https://www.mongodb.com/atlas) (free cloud MongoDB)
> instead of installing MongoDB locally. Just replace `MONGODB_URI` in `.env` with your Atlas connection string.

---

## Step 1 — Install Backend Dependencies

```bash
cd backend
npm install
```

This installs:
- **express** — the web framework
- **mongoose** — MongoDB object modeling
- **bcryptjs** — password hashing
- **jsonwebtoken** — JWT auth tokens
- **cors** — allows the frontend to talk to the backend
- **dotenv** — loads variables from `.env`
- **nodemon** *(dev only)* — auto-restarts server on file changes

---

## Step 2 — Configure Environment Variables

Open `backend/.env` and update the values:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart_student_marketplace
JWT_SECRET=replace_this_with_a_long_random_string
NODE_ENV=development
```

> For MongoDB Atlas, your URI looks like:
> `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/smart_student_marketplace`

---

## Step 3 — Start MongoDB

If using a local MongoDB installation:

```bash
# On macOS (Homebrew)
brew services start mongodb-community

# On Linux
sudo systemctl start mongod

# On Windows — start from Services or run:
net start MongoDB
```

---

## Step 4 — Start the Backend Server

```bash
cd backend

# For development (auto-restarts on changes):
npm run dev

# For production:
npm start
```

You should see:
```
✅ MongoDB Connected: localhost
🚀 Server running on http://localhost:5000
```

Visit `http://localhost:5000` in your browser — you should see:
```json
{ "message": "Smart Student Marketplace API is running ✅" }
```

---

## Step 5 — Run the Frontend

The frontend is plain HTML — no build step needed.

**Option A: Open directly in browser**
```
Open frontend/index.html in your browser
```

**Option B: Use a simple local server (recommended)**
```bash
# Install live-server globally once
npm install -g live-server

# Then run from the frontend folder
cd frontend
live-server
```

This opens the app at `http://localhost:8080` (or similar).

---

## API Reference

### Auth Endpoints

| Method | URL                   | Auth? | Description            |
|--------|-----------------------|-------|------------------------|
| POST   | /api/auth/register    | No    | Create a new account   |
| POST   | /api/auth/login       | No    | Log in, receive token  |

**POST /api/auth/register** — request body:
```json
{
  "name": "Ananya",
  "email": "ananya@amjaincollege.edu.in",
  "password": "mypassword",
  "rollNumber": "22CSE001",
  "universityRegisterNumber": "URN123456",
  "dob": "2003-05-14"
}
```

**POST /api/auth/login** — request body:
```json
{
  "email": "ananya@amjaincollege.edu.in",
  "password": "mypassword"
}
```

Both return a `token` field. The frontend stores this in localStorage and sends it
as `Authorization: Bearer <token>` on protected requests.

---

### Product Endpoints

| Method | URL                  | Auth? | Description                      |
|--------|----------------------|-------|----------------------------------|
| GET    | /api/products        | No    | Get all products                 |
| GET    | /api/products?category=Books | No | Filter by category        |
| GET    | /api/products/:id    | No    | Get a single product             |
| POST   | /api/products        | ✅ Yes | Create a new listing            |
| PUT    | /api/products/:id    | ✅ Yes | Update your listing             |
| DELETE | /api/products/:id    | ✅ Yes | Delete your listing             |

**POST /api/products** — request body:
```json
{
  "name": "Data Structures Textbook",
  "category": "Books",
  "suggestedPrice": 450,
  "originalPrice": 899,
  "image": "https://example.com/book.jpg"
}
```

---

## How the Frontend Talks to the Backend

All API calls are in `frontend/js/api.js`. Here's a quick example:

```javascript
// Login
const user = await loginUser("ananya@amjaincollege.edu.in", "mypassword");
localStorage.setItem("ssm_token", user.token);

// Fetch products
const products = await fetchProducts("Books");

// Add a product (token is sent automatically from localStorage)
const newProduct = await createProduct({ name: "...", category: "Books", ... });

// Delete a product
await deleteProduct("64abc123def456");
```

---

## Key Differences from the Original App

| Feature          | Before (localStorage)         | After (Full-stack)                     |
|------------------|-------------------------------|----------------------------------------|
| User data        | Stored in browser only        | Stored in MongoDB                      |
| Products         | Stored in browser only        | Stored in MongoDB, shared across users |
| Passwords        | Plain text in localStorage    | Hashed with bcrypt                     |
| Authentication   | None                          | JWT tokens                             |
| Data persistence | Lost on clearing browser data | Permanent in database                  |
| Multi-device     | Not supported                 | Works on any device                    |

---

## Troubleshooting

**"MongoDB connection error"**
→ Make sure MongoDB is running locally, or check your Atlas URI in `.env`

**"CORS error" in the browser**
→ Make sure the backend server is running on port 5000

**"Not authorized, no token"**
→ The user needs to log in first; check that the token is saved in localStorage

**Frontend shows "Could not load products"**
→ Check the browser console; the backend may not be running
