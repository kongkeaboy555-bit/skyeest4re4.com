// src/server.js
require('dotenv').config();

// Safety: ensure JWT_SECRET always has a value
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'nexustop_default_secret_please_change_in_production_' + Date.now();
  console.warn('⚠️  JWT_SECRET not set! Using temporary secret. Set JWT_SECRET env var.');
}

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const path      = require('path');

// Init DB on startup (also auto-seeds if empty)
try {
  require('./db/database').getDB();
} catch (err) {
  console.error('❌ DB init failed:', err.message);
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET','POST','PUT','PATCH','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use('/api', rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 30 }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => { console.log(req.method, req.path); next(); });
}

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/games',    require('./routes/games'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/users',    require('./routes/users'));

app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
app.use('/api/*', (_req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'), err => {
    if (err) res.send('<h1>NexusTop API Running</h1><p>Visit <a href="/api/health">/api/health</a></p>');
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎮 NexusTop → http://0.0.0.0:' + PORT);
  console.log('  /api/health  /api/games  /api/orders\n');
});

module.exports = app;
