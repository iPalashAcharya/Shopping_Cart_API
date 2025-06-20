# 🛒 DevifyX Cart & Checkout API

A full-featured shopping cart backend built with **Node.js**, **Express**, and **PostgreSQL**, supporting both **guest** and **logged-in user** carts, session tracking, real-time pricing, wishlist functionality, and more.

---

## 🔧 Features

### ✅ Core Features
- Create & manage shopping carts (guest + user-based)
- Add, update, remove, and fetch cart items
- Real-time price updates from `product` table
- Inventory validation
- Automatic cart expiration (1-day TTL)
- Cart merging on user login
- Session-based tracking with `express-session`
- Subtotal + tax calculation

### 🎁 Bonus Features
- Wishlist support (user-specific)
- Cart activity logging (timestamped logs)
- Metadata on cart items (e.g., color, size)
- Shareable public cart links via `/cart/share/:id`

---

## 🚀 Setup Instructions

### 📦 Prerequisites
- Node.js v16+
- PostgreSQL installed and running
- `npm install` dependencies

---

### 🧪 Environment Setup

Create a `.env` file in the root directory:

```env
DB_USER=your_pg_username
DB_PASSWORD=your_pg_password
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=your_database_name
SESSION_SECRET=your_secret_here
```
###Installation
npm install
npm run dev   # or node index.js

###Database Schema
Ensure you Have the following database schema:
users (user_id, email, password)
product (product_id, name, price, inventory)
cart (cart_id, user_id, session_id, created_at, updated_at, expires_at)
cart_item (cart_item_id, cart_id, product_id, variant_id, quantity, price_at_time, metadata)
wishlist (wishlist_id, user_id, product_id, variant_id, quantity, metadata)
cart_log (log_id, cart_id, action, message, created_at)

###Testing Guide
Registration
POST /auth/register
Body: { "email": "test@example.com", "password": "123456" }

Logging In
POST /auth/login
Body: { "email": "test@example.com", "password": "123456" }

Creating a Cart
POST /cart

Add Item to cart (session based)
POST /items
Body: { "productId": 1, "variantId": 2, "quantity": 1, "metadata": { "color": "black" } }

Get cart
GET /

share cart
GET /cart/share/:id

Add item to wishlist
POST /wishlist
Body: { "productId": 1, "variantId": 2, "quantity": 1, "metadata": { "color": "black" } }

Fetch the wishlist
GET /wishlist

Delete wishlist item
DELETE /wishlist/:id

Activity logs auto-generated after every cart operation in cart_log.


