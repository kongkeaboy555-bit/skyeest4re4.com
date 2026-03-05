// src/routes/games.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// GET /api/games
router.get('/', (req, res) => {
  const db = getDB();
  const { category, platform, search, popular } = req.query;
  let sql = 'SELECT * FROM games WHERE is_active=1';
  const params = [];
  if (category) { sql += ' AND category=?'; params.push(category); }
  if (platform) { sql += ' AND platform=?'; params.push(platform); }
  if (popular)  { sql += ' AND is_popular=1'; }
  if (search)   { sql += ' AND name LIKE ?'; params.push(`%${search}%`); }
  sql += ' ORDER BY is_popular DESC, name ASC';
  const games = db.prepare(sql).all(...params);
  const minP = db.prepare('SELECT MIN(price_usd) as min FROM packages WHERE game_id=? AND is_active=1');
  const result = games.map(g => ({ ...g, min_price: minP.get(g.id)?.min || 0 }));
  res.json({ success: true, data: result, total: result.length });
});

// GET /api/games/:id
router.get('/:id', (req, res) => {
  const db = getDB();
  const game = db.prepare('SELECT * FROM games WHERE id=? AND is_active=1').get(req.params.id);
  if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
  const packages = db.prepare('SELECT * FROM packages WHERE game_id=? AND is_active=1 ORDER BY sort_order ASC, price_usd ASC').all(req.params.id);
  res.json({ success: true, data: { ...game, packages } });
});

// ADMIN: POST /api/games
router.post('/', verifyToken, requireAdmin,
  validate({ name: { required: true }, icon: { required: true }, category: { required: true }, platform: { required: true } }),
  (req, res) => {
    const db = getDB();
    const { name, icon, category, platform, is_popular, needs_server, description } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO games (id,name,icon,category,platform,is_popular,needs_server,description) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, name, icon, category, platform, is_popular ? 1 : 0, needs_server ? 1 : 0, description || null);
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM games WHERE id=?').get(id) });
  }
);

// ADMIN: PUT /api/games/:id
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const db = getDB();
  const fields = ['name','icon','category','platform','is_popular','needs_server','description','is_active'];
  const updates = [], params = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); params.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE games SET ${updates.join(',')} WHERE id=?`).run(...params);
  res.json({ success: true, data: db.prepare('SELECT * FROM games WHERE id=?').get(req.params.id) });
});

// ADMIN: POST /api/games/:id/packages
router.post('/:id/packages', verifyToken, requireAdmin,
  validate({ amount: { required: true, min: 1 }, currency: { required: true }, price_usd: { required: true, min: 0.01 } }),
  (req, res) => {
    const db = getDB();
    const game = db.prepare('SELECT id FROM games WHERE id=?').get(req.params.id);
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    const { amount, currency, price_usd, bonus, is_best_val, sort_order } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO packages (id,game_id,amount,currency,price_usd,bonus,is_best_val,sort_order) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, req.params.id, amount, currency, price_usd, bonus || null, is_best_val ? 1 : 0, sort_order || 0);
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM packages WHERE id=?').get(id) });
  }
);

// ADMIN: DELETE /api/games/:id/packages/:pkgId
router.delete('/:id/packages/:pkgId', verifyToken, requireAdmin, (req, res) => {
  const db = getDB();
  db.prepare('UPDATE packages SET is_active=0 WHERE id=? AND game_id=?').run(req.params.pkgId, req.params.id);
  res.json({ success: true, message: 'Package removed' });
});

module.exports = router;
