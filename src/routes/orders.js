// src/routes/orders.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/database');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

function getFullOrder(db, id) {
  return db.prepare(`
    SELECT o.*,
           g.name as game_name, g.icon as game_icon,
           pkg.amount as pkg_amount, pkg.currency as pkg_currency, pkg.bonus as pkg_bonus,
           pm.name as payment_name, pm.icon as payment_icon
    FROM orders o
    LEFT JOIN games g ON o.game_id=g.id
    LEFT JOIN packages pkg ON o.package_id=pkg.id
    LEFT JOIN payment_methods pm ON o.payment_id=pm.id
    WHERE o.id=?
  `).get(id);
}

function simulateProcessing(db, orderId) {
  setTimeout(() => {
    try {
      const o = db.prepare('SELECT status FROM orders WHERE id=?').get(orderId);
      if (o?.status === 'pending') {
        db.prepare("UPDATE orders SET status='processing',updated_at=datetime('now') WHERE id=?").run(orderId);
        db.prepare("INSERT INTO order_logs (id,order_id,status,message) VALUES (?,?,'processing','Payment verified, processing top-up')").run(uuidv4(), orderId);
        setTimeout(() => {
          db.prepare("UPDATE orders SET status='completed',updated_at=datetime('now') WHERE id=?").run(orderId);
          db.prepare("INSERT INTO order_logs (id,order_id,status,message) VALUES (?,?,'completed','Top-up delivered successfully!')").run(uuidv4(), orderId);
        }, 8000);
      }
    } catch {}
  }, 3000);
}

// GET /api/orders/meta/stats  (admin) — must be before /:id
router.get('/meta/stats', verifyToken, requireAdmin, (req, res) => {
  const db = getDB();
  const stats = db.prepare(`
    SELECT COUNT(*) as total_orders,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status='failed'    THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status='completed' THEN total_usd ELSE 0 END) as revenue,
      COUNT(DISTINCT user_id) as unique_customers
    FROM orders
  `).get();
  const topGames = db.prepare(`
    SELECT g.name,g.icon,COUNT(*) as orders,SUM(o.total_usd) as revenue
    FROM orders o JOIN games g ON o.game_id=g.id
    WHERE o.status='completed'
    GROUP BY g.id ORDER BY orders DESC LIMIT 5
  `).all();
  const recentOrders = db.prepare(`
    SELECT o.*,g.name as game_name,g.icon as game_icon
    FROM orders o LEFT JOIN games g ON o.game_id=g.id
    ORDER BY o.created_at DESC LIMIT 10
  `).all();
  res.json({ success: true, data: { ...stats, topGames, recentOrders } });
});

// POST /api/orders
router.post('/', optionalAuth,
  validate({ game_id: { required: true }, package_id: { required: true }, player_id: { required: true, minLength: 1 }, payment_id: { required: true } }),
  (req, res) => {
    const db = getDB();
    const { game_id, package_id, player_id, server_id, payment_id } = req.body;

    const game = db.prepare('SELECT * FROM games WHERE id=? AND is_active=1').get(game_id);
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });

    const pkg = db.prepare('SELECT * FROM packages WHERE id=? AND game_id=? AND is_active=1').get(package_id, game_id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

    const pay = db.prepare('SELECT * FROM payment_methods WHERE id=? AND is_active=1').get(payment_id);
    if (!pay) return res.status(404).json({ success: false, message: 'Payment method not found' });

    if (game.needs_server && !server_id)
      return res.status(400).json({ success: false, message: 'Server/Zone ID is required for this game' });

    const fee_usd   = parseFloat((pkg.price_usd * (pay.fee_pct / 100)).toFixed(4));
    const total_usd = parseFloat((pkg.price_usd + fee_usd).toFixed(4));
    const orderId   = uuidv4();
    const payRef    = 'NTX-' + Date.now().toString(36).toUpperCase();

    db.prepare(`
      INSERT INTO orders (id,user_id,game_id,package_id,payment_id,player_id,server_id,amount,currency,price_usd,fee_usd,total_usd,status,payment_ref)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending',?)
    `).run(orderId, req.user?.id || null, game_id, package_id, payment_id, player_id, server_id || null, pkg.amount, pkg.currency, pkg.price_usd, fee_usd, total_usd, payRef);

    db.prepare("INSERT INTO order_logs (id,order_id,status,message) VALUES (?,?,'pending','Order created')")
      .run(uuidv4(), orderId);

    simulateProcessing(db, orderId);

    res.status(201).json({ success: true, message: 'Order created!', data: getFullOrder(db, orderId) });
  }
);

// GET /api/orders
router.get('/', verifyToken, (req, res) => {
  const db = getDB();
  const { page = 1, limit = 20, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = req.user.role === 'admin' ? 'WHERE 1=1' : 'WHERE o.user_id=?';
  const params = req.user.role === 'admin' ? [] : [req.user.id];
  if (status) { where += ' AND o.status=?'; params.push(status); }
  const orders = db.prepare(`
    SELECT o.*,g.name as game_name,g.icon as game_icon,
           pkg.amount as pkg_amount,pkg.currency as pkg_currency,pm.name as payment_name
    FROM orders o
    LEFT JOIN games g ON o.game_id=g.id
    LEFT JOIN packages pkg ON o.package_id=pkg.id
    LEFT JOIN payment_methods pm ON o.payment_id=pm.id
    ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
  const total = db.prepare(`SELECT COUNT(*) as n FROM orders o ${where}`).get(...params).n;
  res.json({ success: true, data: orders, total, page: parseInt(page), pages: Math.ceil(total / limit) });
});

// GET /api/orders/:id
router.get('/:id', optionalAuth, (req, res) => {
  const db    = getDB();
  const order = getFullOrder(db, req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (req.user?.role !== 'admin' && order.user_id && order.user_id !== req.user?.id)
    return res.status(403).json({ success: false, message: 'Access denied' });
  const logs = db.prepare('SELECT * FROM order_logs WHERE order_id=? ORDER BY created_at ASC').all(req.params.id);
  res.json({ success: true, data: { ...order, logs } });
});

// ADMIN: PATCH /api/orders/:id/status
router.patch('/:id/status', verifyToken, requireAdmin,
  validate({ status: { required: true, enum: ['pending','processing','completed','failed','refunded'] } }),
  (req, res) => {
    const db = getDB();
    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const { status, notes } = req.body;
    db.prepare("UPDATE orders SET status=?,notes=?,updated_at=datetime('now') WHERE id=?").run(status, notes || order.notes, req.params.id);
    db.prepare("INSERT INTO order_logs (id,order_id,status,message) VALUES (?,?,?,?)").run(uuidv4(), req.params.id, status, notes || `Status changed to ${status}`);
    res.json({ success: true, data: getFullOrder(db, req.params.id) });
  }
);

module.exports = router;
