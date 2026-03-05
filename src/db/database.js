// src/db/database.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

function getDbPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  try { fs.accessSync('/tmp', fs.constants.W_OK); return '/tmp/nexustop.db'; } catch {}
  return path.resolve('./nexustop.db');
}

let db;

function getDB() {
  if (!db) {
    const dbPath = getDbPath();
    console.log('📦 DB:', dbPath);
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    autoSeed();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', balance REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT NOT NULL DEFAULT '🎮',
      category TEXT NOT NULL, platform TEXT NOT NULL, is_popular INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1, needs_server INTEGER NOT NULL DEFAULT 0,
      description TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY, game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL, currency TEXT NOT NULL, price_usd REAL NOT NULL,
      bonus TEXT, is_best_val INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT NOT NULL, type TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1, fee_pct REAL NOT NULL DEFAULT 0,
      min_amount REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id),
      game_id TEXT NOT NULL REFERENCES games(id), package_id TEXT NOT NULL REFERENCES packages(id),
      payment_id TEXT REFERENCES payment_methods(id), player_id TEXT NOT NULL,
      server_id TEXT, amount INTEGER NOT NULL, currency TEXT NOT NULL,
      price_usd REAL NOT NULL, fee_usd REAL NOT NULL DEFAULT 0, total_usd REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', payment_ref TEXT, notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_logs (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id),
      status TEXT NOT NULL, message TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_packages_game ON packages(game_id);
    CREATE INDEX IF NOT EXISTS idx_order_logs    ON order_logs(order_id);
  `);
}

function autoSeed() {
  const n = db.prepare('SELECT COUNT(*) as n FROM games').get().n;
  if (n > 0) { console.log('✅ DB ready (' + n + ' games)'); return; }
  console.log('🌱 Seeding...');
  const { v4: uuidv4 } = require('uuid');
  const bcrypt = require('bcryptjs');

  const games = [
    {name:'Mobile Legends',icon:'💎',cat:'moba',plat:'mobile',pop:1,srv:1,cur:'Diamonds',pkgs:[{a:5,p:.29},{a:22,p:.99},{a:86,p:3.99,b:1},{a:172,p:7.49},{a:514,p:22.99,bns:'+52 Bonus'}]},
    {name:'PUBG Mobile',icon:'🔫',cat:'battle-royale',plat:'mobile',pop:1,srv:0,cur:'UC',pkgs:[{a:60,p:.99},{a:325,p:4.99,b:1},{a:660,p:9.99},{a:1800,p:24.99,bns:'+300 Bonus'}]},
    {name:'Free Fire',icon:'🏹',cat:'battle-royale',plat:'mobile',pop:1,srv:0,cur:'Diamonds',pkgs:[{a:50,p:.49},{a:210,p:1.99,b:1},{a:720,p:5.99,bns:'+70 Bonus'}]},
    {name:'Genshin Impact',icon:'⚡',cat:'rpg',plat:'pc',pop:1,srv:1,cur:'Genesis Crystals',pkgs:[{a:60,p:.99},{a:980,p:14.99,b:1},{a:1980,p:29.99},{a:6480,p:99.99,bns:'+1600 Bonus'}]},
    {name:'Valorant',icon:'🌟',cat:'pc',plat:'pc',pop:0,srv:0,cur:'VP',pkgs:[{a:475,p:4.99},{a:1000,p:9.99,b:1},{a:2050,p:19.99,bns:'+50 VP'}]},
    {name:'Call of Duty Mobile',icon:'🎯',cat:'battle-royale',plat:'mobile',pop:1,srv:0,cur:'CP',pkgs:[{a:80,p:.99},{a:800,p:9.99,b:1},{a:4000,p:49.99,bns:'+400 Bonus'}]},
    {name:'Roblox',icon:'🎮',cat:'mobile',plat:'mobile',pop:1,srv:0,cur:'Robux',pkgs:[{a:80,p:.99},{a:400,p:4.99,b:1},{a:1700,p:19.99,bns:'+100 Bonus'}]},
    {name:'League of Legends',icon:'🌈',cat:'pc',plat:'pc',pop:0,srv:1,cur:'RP',pkgs:[{a:650,p:5},{a:1380,p:10,b:1},{a:5000,p:35,bns:'+250 Bonus'}]},
  ];

  const ig = db.prepare('INSERT OR IGNORE INTO games (id,name,icon,category,platform,is_popular,needs_server,description) VALUES (?,?,?,?,?,?,?,?)');
  const ip = db.prepare('INSERT OR IGNORE INTO packages (id,game_id,amount,currency,price_usd,bonus,is_best_val,sort_order) VALUES (?,?,?,?,?,?,?,?)');
  db.transaction(() => {
    for (const g of games) {
      const gid = uuidv4();
      ig.run(gid,g.name,g.icon,g.cat,g.plat,g.pop,g.srv,g.name+' top up');
      g.pkgs.forEach((p,i) => ip.run(uuidv4(),gid,p.a,g.cur,p.p,p.bns||null,p.b||0,i));
    }
  })();

  [{name:'Credit Card',icon:'💳',type:'card',fee:2.9,min:1},{name:'PayPal',icon:'🅿️',type:'card',fee:3.5,min:1},
   {name:'GoPay',icon:'📱',type:'ewallet',fee:0,min:.5},{name:'OVO',icon:'🟣',type:'ewallet',fee:0,min:.5},
   {name:'DANA',icon:'🔵',type:'ewallet',fee:0,min:.5},{name:'Bank Transfer',icon:'🏦',type:'bank',fee:0,min:2},
   {name:'QRIS',icon:'📷',type:'ewallet',fee:0,min:.5},{name:'ShopeePay',icon:'🛍️',type:'ewallet',fee:0,min:.5}
  ].forEach(p => db.prepare('INSERT OR IGNORE INTO payment_methods (id,name,icon,type,fee_pct,min_amount) VALUES (?,?,?,?,?,?)').run(uuidv4(),p.name,p.icon,p.type,p.fee,p.min));

  const ae = process.env.ADMIN_EMAIL||'admin@nexustop.com';
  const ap = process.env.ADMIN_PASSWORD||'Admin@123456';
  if (!db.prepare('SELECT id FROM users WHERE email=?').get(ae))
    db.prepare("INSERT INTO users (id,email,username,password,role) VALUES (?,?,?,?,'admin')").run(uuidv4(),ae,'admin',bcrypt.hashSync(ap,12));
  console.log('✅ Seed complete!');
}

module.exports = { getDB };
