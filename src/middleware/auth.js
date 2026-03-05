// src/routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { validate }    = require('../middleware/validate');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}
function safeUser(u) { const { password, ...s } = u; return s; }

// POST /api/auth/register
router.post('/register',
  validate({ email: { required: true, type: 'email' }, username: { required: true, minLength: 3, maxLength: 30 }, password: { required: true, minLength: 8 } }),
  (req, res) => {
    const db = getDB();
    const { email, username, password } = req.body;
    const exists = db.prepare('SELECT id FROM users WHERE email=? OR username=?').get(email.toLowerCase(), username);
    if (exists) return res.status(409).json({ success: false, message: 'Email or username already taken' });
    const id = uuidv4();
    db.prepare(`INSERT INTO users (id,email,username,password,role) VALUES (?,?,?,?,'user')`)
      .run(id, email.toLowerCase(), username, bcrypt.hashSync(password, 12));
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
    res.status(201).json({ success: true, message: 'Account created', data: { token: signToken(user), user: safeUser(user) } });
  }
);

// POST /api/auth/login
router.post('/login',
  validate({ email: { required: true }, password: { required: true } }),
  (req, res) => {
    const db = getDB();
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email=? AND is_active=1').get(email.toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    res.json({ success: true, message: 'Login successful', data: { token: signToken(user), user: safeUser(user) } });
  }
);

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: safeUser(user) });
});

// PUT /api/auth/password
router.put('/password', verifyToken,
  validate({ currentPassword: { required: true }, newPassword: { required: true, minLength: 8 } }),
  (req, res) => {
    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    if (!bcrypt.compareSync(req.body.currentPassword, user.password))
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    db.prepare("UPDATE users SET password=?,updated_at=datetime('now') WHERE id=?")
      .run(bcrypt.hashSync(req.body.newPassword, 12), user.id);
    res.json({ success: true, message: 'Password updated' });
  }
);

module.exports = router;
