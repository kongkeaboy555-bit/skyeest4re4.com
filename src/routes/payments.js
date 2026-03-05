// src/routes/payments.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  res.json({ success: true, data: db.prepare('SELECT * FROM payment_methods WHERE is_active=1 ORDER BY type,name').all() });
});

router.post('/', verifyToken, requireAdmin,
  validate({ name: { required: true }, icon: { required: true }, type: { required: true, enum: ['card','ewallet','bank','crypto'] } }),
  (req, res) => {
    const db = getDB();
    const { name, icon, type, fee_pct = 0, min_amount = 0 } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO payment_methods (id,name,icon,type,fee_pct,min_amount) VALUES (?,?,?,?,?,?)').run(id, name, icon, type, fee_pct, min_amount);
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM payment_methods WHERE id=?').get(id) });
  }
);

router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const db = getDB();
  const fields = ['name','icon','type','fee_pct','min_amount','is_active'];
  const updates = [], params = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f}=?`); params.push(req.body[f]); } }
  if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE payment_methods SET ${updates.join(',')} WHERE id=?`).run(...params);
  res.json({ success: true, data: db.prepare('SELECT * FROM payment_methods WHERE id=?').get(req.params.id) });
});

module.exports = router;
