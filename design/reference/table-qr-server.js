/*
 * server.js — the backend. Plain Node.js, no frameworks, no npm packages needed.
 *
 * Jobs:
 *   1. Serve the web pages in /public (guest page, /admin dashboard)
 *   2. Answer the /api/... requests from those pages
 *   3. Check payments with Paystack using your SECRET key (which never leaves this server)
 *   4. Save everything to data/db.json
 *
 * Run it:  node server.js     then open http://localhost:3000/?t=4
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Logic = require('./public/js/logic.js');

// ---------- 1. Settings (from the .env file or real environment variables) ----------
loadDotEnv(path.join(__dirname, '.env'));
const PORT = process.env.PORT || 3000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';   // sk_test_... or sk_live_...  NEVER put this in the frontend
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || '';   // pk_test_... safe for the browser
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';                   // change this before going live!
const DEMO_MODE = !PAYSTACK_SECRET_KEY || !PAYSTACK_PUBLIC_KEY;      // no keys = fake payments only

// Tiny .env reader so we don't need the "dotenv" package. Lines look like KEY=value
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// ---------- 2. The "database": one JSON file ----------
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const SEED_FILE = path.join(__dirname, 'data', 'seed.json');
if (!fs.existsSync(DB_FILE)) fs.copyFileSync(SEED_FILE, DB_FILE); // first run: start from the sample data
let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

function saveDb() {
  // Write to a temp file first, then rename. If the server crashes mid-write, db.json is not corrupted.
  fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db, null, 2));
  fs.renameSync(DB_FILE + '.tmp', DB_FILE);
}

// ---------- 3. Small helpers ----------
function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// Reads the request body. We keep the RAW text too, because the webhook signature is checked on the raw bytes.
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) { reject(new Error('Body too large')); req.destroy(); }
    });
    req.on('end', () => {
      let json = {};
      try { json = raw ? JSON.parse(raw) : {}; } catch (e) { /* leave as {} */ }
      resolve({ raw, json });
    });
  });
}

function isAdmin(req) {
  const given = String(req.headers['x-admin-pin'] || '');
  return given.length === ADMIN_PIN.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(ADMIN_PIN));
}

// ---------- 4. Paystack ----------

// Asks Paystack "did this payment really succeed?". This is the ONLY way an order becomes paid in live mode.
async function verifyWithPaystack(reference) {
  const r = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), {
    headers: { Authorization: 'Bearer ' + PAYSTACK_SECRET_KEY }
  });
  const body = await r.json();
  if (!r.ok || !body.status) {
    const e = new Error(body.message || 'Could not verify payment'); e.status = 502; throw e;
  }
  const t = body.data;
  if (t.status !== 'success') {
    const e = new Error('Payment not completed yet (' + t.status + ')'); e.status = 402; throw e;
  }
  if (t.currency !== 'GHS') {
    const e = new Error('Wrong currency'); e.status = 400; throw e;
  }
  // markPaid also checks that t.amount (pesewas) equals the order total.
  return Logic.markPaid(db, reference, { channel: t.channel, amount: t.amount, network: t.authorization && t.authorization.bank });
}

// Paystack signs every webhook with HMAC-SHA512 of the raw body using your secret key.
// If the signature doesn't match, someone is faking it, so we ignore it.
function validPaystackSignature(raw, signature) {
  if (!PAYSTACK_SECRET_KEY || !signature) return false;
  const expected = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  return expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
}

// ---------- 5. The API routes ----------
async function handleApi(req, res, url) {
  const { raw, json } = await readBody(req);
  const route = req.method + ' ' + url.pathname;
  let m;

  // --- Guest (public) routes ---
  if (route === 'GET /api/config') {
    return sendJson(res, 200, { demoMode: DEMO_MODE, publicKey: DEMO_MODE ? null : PAYSTACK_PUBLIC_KEY });
  }
  if (route === 'GET /api/shop') return sendJson(res, 200, Logic.publicShop(db));

  if (route === 'POST /api/orders') {
    const order = Logic.createOrder(db, json); saveDb();
    return sendJson(res, 201, Logic.publicOrder(db, order.id));
  }
  if (req.method === 'GET' && (m = url.pathname.match(/^\/api\/orders\/([\w-]+)$/))) {
    return sendJson(res, 200, Logic.publicOrder(db, m[1]));
  }

  // The browser calls this after the payment popup closes.
  if (route === 'POST /api/verify') {
    const order = db.orders.find((o) => o.reference === json.reference);
    if (!order) return sendJson(res, 404, { error: 'No order with that reference' });
    if (DEMO_MODE) {
      // DEMO: no real money. We pretend the MoMo prompt was approved.
      Logic.markPaid(db, json.reference, { channel: 'mobile_money', network: json.network, amount: order.total, demo: true });
    } else {
      if (json.demo) return sendJson(res, 400, { error: 'Demo payments are switched off in live mode' });
      await verifyWithPaystack(json.reference);
    }
    saveDb();
    return sendJson(res, 200, Logic.publicOrder(db, order.id));
  }

  // Paystack calls this directly (server to server). Works even if the guest closes their browser.
  if (route === 'POST /api/paystack-webhook') {
    if (!validPaystackSignature(raw, req.headers['x-paystack-signature'])) {
      return sendJson(res, 401, { error: 'Bad signature' });
    }
    const event = json;
    if (event.event === 'charge.success' && event.data && event.data.currency === 'GHS') {
      try {
        Logic.markPaid(db, event.data.reference, { channel: event.data.channel, amount: event.data.amount });
        saveDb();
      } catch (e) {
        console.warn('Webhook for unknown/mismatched order:', event.data.reference, e.message);
      }
    }
    return sendJson(res, 200, { received: true }); // always answer 200 quickly so Paystack stops retrying
  }

  if (req.method === 'GET' && (m = url.pathname.match(/^\/api\/loyalty\/([\d+ ]+)$/))) {
    return sendJson(res, 200, Logic.loyaltyCard(db, decodeURIComponent(m[1])));
  }
  if (route === 'POST /api/waiter') {
    const call = Logic.callWaiter(db, json); saveDb();
    return sendJson(res, 201, call);
  }
  if (route === 'POST /api/review-click') {
    Logic.reviewClicked(db, json.orderId); saveDb();
    return sendJson(res, 200, { ok: true });
  }

  // --- Owner routes (need the PIN in the "x-admin-pin" header) ---
  if (url.pathname.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return sendJson(res, 401, { error: 'Wrong PIN' });
    if (route === 'GET /api/admin/summary') return sendJson(res, 200, Logic.summary(db));
    if (req.method === 'POST' && (m = url.pathname.match(/^\/api\/admin\/orders\/([\w-]+)\/status$/))) {
      const o = Logic.setKitchenStatus(db, m[1], json.status); saveDb(); return sendJson(res, 200, o);
    }
    if (req.method === 'POST' && (m = url.pathname.match(/^\/api\/admin\/menu\/([\w-]+)$/))) {
      const it = Logic.updateMenuItem(db, m[1], json); saveDb(); return sendJson(res, 200, it);
    }
    if (req.method === 'POST' && (m = url.pathname.match(/^\/api\/admin\/waiter\/([\w-]+)\/done$/))) {
      const c = Logic.waiterDone(db, m[1]); saveDb(); return sendJson(res, 200, c);
    }
  }
  return sendJson(res, 404, { error: 'Not found' });
}

// ---------- 6. Static files (HTML, CSS, JS) ----------
const PUBLIC_DIR = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };

function serveStatic(req, res, url) {
  let p = url.pathname;
  if (p === '/') p = '/index.html';
  if (p === '/admin' || p === '/admin/') p = '/admin.html';
  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': (TYPES[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8' });
  fs.createReadStream(file).pipe(res);
}

// ---------- 7. Start ----------
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else serveStatic(req, res, url);
  } catch (err) {
    if (!err.status) console.error(err);
    sendJson(res, err.status || 500, { error: err.status ? err.message : 'Something went wrong' });
  }
}).listen(PORT, () => {
  console.log('Table QR running on http://localhost:' + PORT + '/?t=4');
  console.log('Owner dashboard:   http://localhost:' + PORT + '/admin  (PIN ' + (process.env.ADMIN_PIN ? 'from .env' : '1234') + ')');
  console.log(DEMO_MODE ? '*** DEMO MODE: no Paystack keys, payments are simulated ***' : 'LIVE PAYSTACK MODE (' + (PAYSTACK_SECRET_KEY.startsWith('sk_test') ? 'test keys' : 'LIVE keys') + ')');
});
