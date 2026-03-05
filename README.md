# 🎮 NexusTop — Game Top-Up Store

Full-stack game top-up website (Node.js + Express + SQLite).

---

## 📁 Folder Structure

```
nexustop/
├── package.json          ← dependencies & scripts
├── .env.example          ← copy to .env and edit
├── .gitignore
├── public/
│   └── index.html        ← frontend (served automatically)
└── src/
    ├── server.js          ← main entry point
    ├── db/
    │   ├── database.js    ← SQLite schema
    │   └── seed.js        ← populate games & admin
    ├── routes/
    │   ├── auth.js        ← register / login / me
    │   ├── games.js       ← game catalog
    │   ├── orders.js      ← top-up orders
    │   ├── payments.js    ← payment methods
    │   └── users.js       ← user management (admin)
    └── middleware/
        ├── auth.js        ← JWT guard
        └── validate.js    ← input validation
```

---

## 🚀 Setup (Local)

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env
# Open .env and change JWT_SECRET to something long and random

# 3. Seed the database (creates games + admin account)
npm run seed

# 4. Start the server
npm run dev        # development (auto-reload)
npm start          # production
```

Open → **http://localhost:3001**

---

## 🔑 Admin Account

| Field    | Value                    |
|----------|--------------------------|
| Email    | admin@nexustop.com       |
| Password | Admin@123456             |

> Change these in `.env` before going live!

---

## 📡 API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/health | — | Server health check |
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Login → JWT token |
| GET | /api/auth/me | ✅ | Get current user |
| GET | /api/games | — | List all games |
| GET | /api/games/:id | — | Game + packages |
| GET | /api/payments | — | Payment methods |
| POST | /api/orders | Optional | Create top-up order |
| GET | /api/orders | ✅ | My orders |
| GET | /api/orders/:id | Optional | Order detail |
| GET | /api/orders/meta/stats | 🔒 Admin | Dashboard stats |

---

## 🚢 Deploy to Railway (Recommended)

1. Go to **railway.app** → New Project → Deploy from GitHub
2. Connect your repo
3. Add environment variables (from `.env.example`)
4. Railway auto-detects Node.js and runs `npm start`
5. Add a custom domain if needed

> SQLite works perfectly on Railway with persistent volumes.

---

## 🔌 Add Real Payment Gateway

In `src/routes/orders.js`, find `simulateProcessing()` and replace with your gateway:

**Midtrans (Southeast Asia):**
```bash
npm install midtrans-client
```

**Stripe (Global):**
```bash
npm install stripe
```

See their docs for webhook integration.
