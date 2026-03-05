// src/routes/users.js
const express = require('express');
const { getDB } = require('../db/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, requireAdmin, (req, res) => {
  const db = getDB();
  const { page = 1, limit = 20, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = 'WHERE 1=1'; const params = [];
  if (search) { where += ' AND (email LIKE ? OR username LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  const users = db.prepare(`SELECT id,email,username,role,balance,is_active,created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  const total = db.prepare(`SELECT COUNT(*) as n FROM users ${where}`).get(...params).n;
  res.json({ success: true, data: users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
});

router.get('/:id', verifyToken, requireAdmin, (req, res) => {
  const db   = getDB();
  const user = db.prepare('SELECT id,email,username,role,balance,is_active,created_at FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const orders = db.prepare(`SELECT o.*,g.name as game_name FROM orders o LEFT JOIN games g ON o.game_id=g.id WHERE o.user_id=? ORDER BY o.created_at DESC LIMIT 10`).all(req.params.id);
  res.json({ success: true, data: { ...user, recentOrders: orders } });
});

router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const db = getDB();
  const { is_active, role } = req.body;
  const fields = [], params = [];
  if (is_active !== undefined) { fields.push('is_active=?'); params.push(is_active ? 1 : 0); }
  if (role      !== undefined) { fields.push('role=?');      params.push(role); }
  if (!fields.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${fields.join(',')},updated_at=datetime('now') WHERE id=?`).run(...params);
  res.json({ success: true, message: 'User updated' });
});

module.exports = router;
