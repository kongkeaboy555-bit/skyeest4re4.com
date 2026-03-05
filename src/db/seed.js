// src/db/seed.js
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getDB } = require('./database');

const db = getDB();
console.log('🌱 Seeding database...');

// ── GAMES & PACKAGES ────────────────────────────────────────────────
const gamesData = [
  {
    name: 'Mobile Legends', icon: '💎', category: 'moba', platform: 'mobile',
    is_popular: 1, needs_server: 1,
    description: 'Top up Mobile Legends Diamonds instantly.',
    currency: 'Diamonds',
    packages: [
      { amount: 5,    price: 0.29 },
      { amount: 12,   price: 0.59 },
      { amount: 22,   price: 0.99 },
      { amount: 56,   price: 2.49 },
      { amount: 86,   price: 3.99, is_best_val: 1 },
      { amount: 172,  price: 7.49 },
      { amount: 257,  price: 11.49, bonus: '+26 Bonus' },
      { amount: 514,  price: 22.99, bonus: '+52 Bonus' },
    ]
  },
  {
    name: 'PUBG Mobile', icon: '🔫', category: 'battle-royale', platform: 'mobile',
    is_popular: 1, needs_server: 0,
    description: 'Buy UC for PUBG Mobile fast.',
    currency: 'UC',
    packages: [
      { amount: 60,   price: 0.99 },
      { amount: 180,  price: 2.99 },
      { amount: 325,  price: 4.99, is_best_val: 1 },
      { amount: 660,  price: 9.99 },
      { amount: 1800, price: 24.99, bonus: '+300 Bonus' },
      { amount: 3850, price: 49.99, bonus: '+700 Bonus' },
    ]
  },
  {
    name: 'Free Fire', icon: '🏹', category: 'battle-royale', platform: 'mobile',
    is_popular: 1, needs_server: 0,
    description: 'Top up Free Fire Diamonds instantly.',
    currency: 'Diamonds',
    packages: [
      { amount: 50,   price: 0.49 },
      { amount: 140,  price: 1.29 },
      { amount: 210,  price: 1.99, is_best_val: 1 },
      { amount: 355,  price: 2.99 },
      { amount: 720,  price: 5.99, bonus: '+70 Bonus' },
      { amount: 1450, price: 11.99, bonus: '+150 Bonus' },
    ]
  },
  {
    name: 'Genshin Impact', icon: '⚡', category: 'rpg', platform: 'pc',
    is_popular: 1, needs_server: 1,
    description: 'Genesis Crystals for Genshin Impact.',
    currency: 'Genesis Crystals',
    packages: [
      { amount: 60,   price: 0.99 },
      { amount: 300,  price: 4.99 },
      { amount: 980,  price: 14.99, is_best_val: 1 },
      { amount: 1980, price: 29.99 },
      { amount: 3280, price: 49.99, bonus: '+600 Bonus' },
      { amount: 6480, price: 99.99, bonus: '+1600 Bonus' },
    ]
  },
  {
    name: 'Valorant', icon: '🌟', category: 'pc', platform: 'pc',
    is_popular: 0, needs_server: 0,
    description: 'Valorant Points top up.',
    currency: 'VP',
    packages: [
      { amount: 475,  price: 4.99 },
      { amount: 1000, price: 9.99, is_best_val: 1 },
      { amount: 2050, price: 19.99, bonus: '+50 VP' },
      { amount: 3650, price: 34.99, bonus: '+150 VP' },
      { amount: 5350, price: 49.99, bonus: '+350 VP' },
    ]
  },
  {
    name: 'Call of Duty Mobile', icon: '🎯', category: 'battle-royale', platform: 'mobile',
    is_popular: 1, needs_server: 0,
    description: 'COD Points for Call of Duty Mobile.',
    currency: 'CP',
    packages: [
      { amount: 80,   price: 0.99 },
      { amount: 400,  price: 4.99 },
      { amount: 800,  price: 9.99, is_best_val: 1 },
      { amount: 2000, price: 24.99 },
      { amount: 4000, price: 49.99, bonus: '+400 Bonus' },
    ]
  },
  {
    name: 'Roblox', icon: '🎮', category: 'mobile', platform: 'mobile',
    is_popular: 1, needs_server: 0,
    description: 'Robux top up for Roblox.',
    currency: 'Robux',
    packages: [
      { amount: 80,   price: 0.99 },
      { amount: 400,  price: 4.99, is_best_val: 1 },
      { amount: 800,  price: 9.99 },
      { amount: 1700, price: 19.99, bonus: '+100 Bonus' },
      { amount: 4500, price: 49.99, bonus: '+500 Bonus' },
    ]
  },
  {
    name: 'League of Legends', icon: '🌈', category: 'pc', platform: 'pc',
    is_popular: 0, needs_server: 1,
    description: 'Riot Points (RP) for League of Legends.',
    currency: 'RP',
    packages: [
      { amount: 650,  price: 5.00 },
      { amount: 1380, price: 10.00, is_best_val: 1 },
      { amount: 2800, price: 20.00, bonus: '+20 Bonus' },
      { amount: 5000, price: 35.00, bonus: '+250 Bonus' },
      { amount: 7200, price: 50.00, bonus: '+700 Bonus' },
    ]
  },
  {
    name: 'Honor of Kings', icon: '🐲', category: 'moba', platform: 'mobile',
    is_popular: 0, needs_server: 0,
    description: 'Tokens top up for Honor of Kings.',
    currency: 'Tokens',
    packages: [
      { amount: 60,   price: 0.49 },
      { amount: 180,  price: 1.29 },
      { amount: 300,  price: 2.09, is_best_val: 1 },
      { amount: 600,  price: 3.99 },
      { amount: 1500, price: 9.49, bonus: '+150 Bonus' },
    ]
  },
  {
    name: 'Clash of Clans', icon: '🏰', category: 'mobile', platform: 'mobile',
    is_popular: 0, needs_server: 0,
    description: 'Gems top up for Clash of Clans.',
    currency: 'Gems',
    packages: [
      { amount: 80,   price: 0.99 },
      { amount: 500,  price: 4.99 },
      { amount: 1200, price: 9.99, is_best_val: 1 },
      { amount: 2500, price: 19.99 },
      { amount: 6500, price: 49.99, bonus: '+500 Bonus' },
    ]
  },
  {
    name: 'Arena of Valor', icon: '⚔️', category: 'moba', platform: 'mobile',
    is_popular: 0, needs_server: 1,
    description: 'Vouchers for Arena of Valor.',
    currency: 'Vouchers',
    packages: [
      { amount: 50,  price: 0.49 },
      { amount: 150, price: 1.29 },
      { amount: 250, price: 2.09, is_best_val: 1 },
      { amount: 500, price: 3.99 },
    ]
  },
  {
    name: 'Genshin Impact', icon: '🌸', category: 'rpg', platform: 'mobile',
    is_popular: 0, needs_server: 1,
    description: 'Welkin Moon pass for Genshin Impact.',
    currency: 'Welkin',
    packages: [
      { amount: 1, price: 4.99, is_best_val: 1 },
      { amount: 3, price: 13.99, bonus: 'Save 7%' },
      { amount: 6, price: 26.99, bonus: 'Save 10%' },
    ]
  },
];

const insertGame = db.prepare(`
  INSERT OR IGNORE INTO games (id, name, icon, category, platform, is_popular, needs_server, description)
  VALUES (@id, @name, @icon, @category, @platform, @is_popular, @needs_server, @description)
`);
const insertPkg = db.prepare(`
  INSERT OR IGNORE INTO packages (id, game_id, amount, currency, price_usd, bonus, is_best_val, sort_order)
  VALUES (@id, @game_id, @amount, @currency, @price_usd, @bonus, @is_best_val, @sort_order)
`);

const seedGames = db.transaction(() => {
  for (const g of gamesData) {
    const gameId = uuidv4();
    insertGame.run({
      id: gameId, name: g.name, icon: g.icon,
      category: g.category, platform: g.platform,
      is_popular: g.is_popular, needs_server: g.needs_server,
      description: g.description
    });
    g.packages.forEach((p, i) => {
      insertPkg.run({
        id: uuidv4(), game_id: gameId,
        amount: p.amount, currency: g.currency,
        price_usd: p.price, bonus: p.bonus || null,
        is_best_val: p.is_best_val || 0, sort_order: i
      });
    });
  }
});
seedGames();
console.log(`✅ Seeded ${gamesData.length} games`);

// ── PAYMENT METHODS ──────────────────────────────────────────────────
const payments = [
  { name: 'Credit Card',   icon: '💳', type: 'card',    fee_pct: 2.9, min_amount: 1 },
  { name: 'PayPal',        icon: '🅿️',  type: 'card',    fee_pct: 3.5, min_amount: 1 },
  { name: 'GoPay',         icon: '📱', type: 'ewallet', fee_pct: 0,   min_amount: 0.5 },
  { name: 'OVO',           icon: '🟣', type: 'ewallet', fee_pct: 0,   min_amount: 0.5 },
  { name: 'DANA',          icon: '🔵', type: 'ewallet', fee_pct: 0,   min_amount: 0.5 },
  { name: 'Bank Transfer', icon: '🏦', type: 'bank',    fee_pct: 0,   min_amount: 2 },
  { name: 'QRIS',          icon: '📷', type: 'ewallet', fee_pct: 0,   min_amount: 0.5 },
  { name: 'ShopeePay',     icon: '🛍️', type: 'ewallet', fee_pct: 0,   min_amount: 0.5 },
];
const insertPay = db.prepare(`
  INSERT OR IGNORE INTO payment_methods (id, name, icon, type, fee_pct, min_amount)
  VALUES (@id, @name, @icon, @type, @fee_pct, @min_amount)
`);
for (const p of payments) insertPay.run({ id: uuidv4(), ...p });
console.log(`✅ Seeded ${payments.length} payment methods`);

// ── ADMIN USER ───────────────────────────────────────────────────────
const adminEmail = process.env.ADMIN_EMAIL || 'admin@nexustop.com';
const adminPass  = process.env.ADMIN_PASSWORD || 'Admin@123456';
const existing   = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!existing) {
  const hash = bcrypt.hashSync(adminPass, 12);
  db.prepare(`INSERT INTO users (id, email, username, password, role) VALUES (?, ?, ?, ?, 'admin')`)
    .run(uuidv4(), adminEmail, 'admin', hash);
  console.log(`✅ Admin created: ${adminEmail} / ${adminPass}`);
} else {
  console.log('ℹ️  Admin already exists');
}

console.log('\n🎉 Database ready!');
process.exit(0);
