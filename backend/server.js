// ============================================================
//   FEASTFLOW - NODE.JS + EXPRESS BACKEND SERVER
//   File: backend/server.js
//
//   HOW TO RUN:
//   1) npm install express mysql2 cors
//   2) node server.js
//   Server runs at: http://localhost:3000
// ============================================================

const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');

const app  = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('../frontend')); // serve index.html

// ── MySQL Connection Pool ──────────────────────────────────
const pool = mysql.createPool({
  host:     'localhost',
  user:     'root',        // ← apla MySQL username
  password: 'root',        // ← apla MySQL password
  database: 'feastflow_db',
  waitForConnections: true,
  connectionLimit: 10,
});

// Helper: run query
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// ── Helper: Sanitize address_id ────────────────────────────
// Converts address_id to a valid integer, or returns null if invalid.
// This prevents "Out of range value for column 'address_id'" SQL errors.
function sanitizeAddressId(raw) {
  if (raw === undefined || raw === null || raw === '' || raw === 0 || raw === '0') {
    return null;
  }
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

// ============================================================
//   AUTH ROUTES
// ============================================================

// POST /api/auth/register  →  New user create karo
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, mobile, email } = req.body;
    if (!name || !mobile || !email)
      return res.status(400).json({ error: 'All fields are required' });

    // Check duplicate
    const exists = await query(
      'SELECT id FROM users WHERE mobile = ? OR email = ?',
      [mobile, email]
    );
    if (exists.length)
      return res.status(409).json({ error: 'Mobile or Email already registered' });

    // SQL: INSERT INTO users
    const result = await query(
      'INSERT INTO users (name, mobile, email) VALUES (?, ?, ?)',
      [name, mobile, email]
    );
    const user = await query('SELECT * FROM users WHERE id = ?', [result.insertId]);

    console.log(`[REGISTER] New user created → id: ${result.insertId}, name: ${name}`);
    res.status(201).json({ success: true, user: user[0] });

  } catch (err) {
    console.error('[REGISTER ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login  →  User login verify karo
app.post('/api/auth/login', async (req, res) => {
  try {
    const { mobile, email } = req.body;
    if (!mobile || !email)
      return res.status(400).json({ error: 'Mobile and Email required' });

    // SQL: SELECT user
    const users = await query(
      'SELECT * FROM users WHERE mobile = ? AND email = ?',
      [mobile, email]
    );
    if (!users.length)
      return res.status(404).json({ error: 'No account found. Please register.' });

    console.log(`[LOGIN] User logged in → id: ${users[0].id}, name: ${users[0].name}`);
    res.json({ success: true, user: users[0] });

  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//   PRODUCT ROUTES
// ============================================================

// GET /api/products  →  Sagle products (search + category filter)
app.get('/api/products', async (req, res) => {
  try {
    const { search, category, popular } = req.query;
    let sql = 'SELECT * FROM products WHERE is_active = 1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (popular === '1') {
      sql += ' AND is_popular = 1';
    }
    sql += ' ORDER BY rating DESC';

    const products = await query(sql, params);
    res.json({ success: true, products });

  } catch (err) {
    console.error('[PRODUCTS ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id  →  Single product + similar items
app.get('/api/products/:id', async (req, res) => {
  try {
    const products = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!products.length)
      return res.status(404).json({ error: 'Product not found' });

    const product = products[0];
    // Similar items: same category, different id
    const similar = await query(
      'SELECT * FROM products WHERE category = ? AND id != ? AND is_active = 1 LIMIT 5',
      [product.category, product.id]
    );

    res.json({ success: true, product, similar });

  } catch (err) {
    console.error('[PRODUCT DETAIL ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//   ADDRESS ROUTES
// ============================================================

// GET /api/addresses/:userId  →  User cha address
app.get('/api/addresses/:userId', async (req, res) => {
  try {
    const addresses = await query(
      'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC',
      [req.params.userId]
    );
    res.json({ success: true, addresses });
  } catch (err) {
    console.error('[GET ADDRESS ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/addresses  →  Nava address save karo
app.post('/api/addresses', async (req, res) => {
  try {
    const { user_id, flat, street, city, pincode, label } = req.body;
    if (!user_id || !flat || !street || !city)
      return res.status(400).json({ error: 'All address fields required' });

    // Set all existing as non-default
    await query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [user_id]);

    const result = await query(
      'INSERT INTO addresses (user_id, label, flat, street, city, pincode, is_default) VALUES (?,?,?,?,?,?,1)',
      [user_id, label || 'Home', flat, street, city, pincode || '']
    );

    const addr = await query('SELECT * FROM addresses WHERE id = ?', [result.insertId]);
    console.log(`[ADDRESS] New address saved → address_id: ${result.insertId}, user_id: ${user_id}`);
    res.status(201).json({ success: true, address: addr[0] });

  } catch (err) {
    console.error('[SAVE ADDRESS ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/addresses/:id  →  Address update karo
app.put('/api/addresses/:id', async (req, res) => {
  try {
    const { flat, street, city, pincode } = req.body;
    await query(
      'UPDATE addresses SET flat = ?, street = ?, city = ?, pincode = ? WHERE id = ?',
      [flat, street, city, pincode || '', req.params.id]
    );
    const addr = await query('SELECT * FROM addresses WHERE id = ?', [req.params.id]);
    console.log(`[ADDRESS] Updated address → address_id: ${req.params.id}`);
    res.json({ success: true, address: addr[0] });
  } catch (err) {
    console.error('[UPDATE ADDRESS ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//   ORDER ROUTES
// ============================================================

// POST /api/orders  →  New order place karo
app.post('/api/orders', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { user_id, address_id, items, payment_mode } = req.body;

    // FIX: Sanitize address_id — convert to integer or null to avoid
    // "Out of range value for column 'address_id'" MySQL error.
    const safeAddressId = sanitizeAddressId(address_id);
    console.log(`[ORDER] Incoming address_id: ${address_id} → sanitized: ${safeAddressId}`);

    if (!user_id || !items || !items.length)
      return res.status(400).json({ error: 'Invalid order data' });

    // Calculate totals using the transaction connection (conn)
    let subtotal = 0;
    for (const item of items) {
      const [prod] = await conn.execute(
        'SELECT price FROM products WHERE id = ?',
        [item.product_id]
      );
      if (!prod.length) throw new Error(`Product ${item.product_id} not found`);

      const lineTotal = prod[0].price * item.quantity;
      subtotal += lineTotal;
      console.log(`[ORDER] product_id: ${item.product_id}, qty: ${item.quantity}, line_total: ${lineTotal}`);
    }

    const gst          = parseFloat((subtotal * 0.05).toFixed(2));
    const delivery_fee = 40.00;
    const total        = parseFloat((subtotal + gst + delivery_fee).toFixed(2));

    console.log(`[ORDER] subtotal: ${subtotal}, gst: ${gst}, delivery_fee: ${delivery_fee}, total: ${total}`);

    // FIX: Use safeAddressId (integer or null) in INSERT — prevents SQL column range error
    // SQL: INSERT INTO orders
    const [orderResult] = await conn.execute(
      `INSERT INTO orders (user_id, address_id, subtotal, gst, delivery_fee, total, payment_mode, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        user_id,
        safeAddressId,           // ← FIX: always integer or null, never undefined/string/"0"
        subtotal,
        gst,
        delivery_fee,
        total,
        payment_mode || 'online'
      ]
    );

    const orderId = orderResult.insertId;
    console.log(`[ORDER] Order inserted → order_id: ${orderId}`);

    // FIX: Use conn (not pool) for order_items insert — must stay within the transaction
    // SQL: INSERT INTO order_items (for each item)
    for (const item of items) {
      const [prod] = await conn.execute(
        'SELECT price FROM products WHERE id = ?',
        [item.product_id]
      );

      if (!prod.length) throw new Error(`Product ${item.product_id} not found during item insert`);

      const unit_price = prod[0].price;
      await conn.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, unit_price]
      );
      console.log(`[ORDER ITEM] Inserted → order_id: ${orderId}, product_id: ${item.product_id}, qty: ${item.quantity}, unit_price: ${unit_price}`);
    }

    await conn.commit();
    console.log(`[ORDER] Transaction committed → order_id: ${orderId}`);

    // Return full order with JOIN
    const [fullOrder] = await conn.execute(`
      SELECT o.*, u.name AS customer_name, u.mobile,
             a.flat, a.street, a.city
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN addresses a ON a.id = o.address_id
      WHERE o.id = ?`, [orderId]);

    res.status(201).json({
      success: true,
      order: fullOrder[0],
      order_id: `FF${String(orderId).padStart(3, '0')}`
    });

  } catch (err) {
    await conn.rollback();
    console.error('[ORDER ERROR] Transaction rolled back →', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/orders/user/:userId  →  User cha order history (JOIN query)
app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    // Full JOIN query: orders + users + addresses + order_items + products
    const orders = await query(`
      SELECT
        o.id,  o.status,  o.total,  o.subtotal,
        o.gst, o.delivery_fee, o.payment_mode,  o.placed_at,
        o.delivered_at,
        u.name AS customer_name,
        a.flat, a.street, a.city
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN addresses a ON a.id = o.address_id
      WHERE o.user_id = ?
      ORDER BY o.placed_at DESC`,
      [req.params.userId]
    );

    // Items for each order
    for (const order of orders) {
      order.items = await query(`
        SELECT oi.quantity, oi.unit_price,
               p.name, p.emoji, p.category
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?`,
        [order.id]
      );
    }

    res.json({ success: true, orders });

  } catch (err) {
    console.error('[ORDER HISTORY ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id/status  →  Live order status
app.get('/api/orders/:id/status', async (req, res) => {
  try {
    const orders = await query(
      'SELECT id, status, placed_at, delivered_at FROM orders WHERE id = ?',
      [req.params.id]
    );
    if (!orders.length) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order: orders[0] });
  } catch (err) {
    console.error('[ORDER STATUS ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id/status  →  Status update karo (admin use)
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    const delivered_at = status === 'delivered' ? new Date() : null;
    await query(
      'UPDATE orders SET status = ?, delivered_at = ? WHERE id = ?',
      [status, delivered_at, req.params.id]
    );

    console.log(`[ORDER STATUS] order_id: ${req.params.id} → updated to: ${status}`);
    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (err) {
    console.error('[ORDER STATUS UPDATE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ FeastFlow Server running → http://localhost:${PORT}`);
  console.log(`📦 MySQL connected to feastflow_db`);
});