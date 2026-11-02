/*
 * logic.js — the shop's RULES, in one place.
 *
 * This file is used in two places:
 *   1. server.js loads it with require() (the real app)
 *   2. demo.html loads it in the browser (the offline demo)
 * So the totals, the loyalty stamps and the order rules are always the same.
 *
 * Everything works on a plain "db" object (see data/seed.json for its shape).
 * Money is always stored in PESEWAS (whole numbers): GH₵65.00 = 6500.
 * Whole numbers avoid floating-point mistakes like 0.1 + 0.2 = 0.30000000000000004,
 * and Paystack also wants the amount in pesewas.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); // Node
  else root.Logic = factory();                                                  // browser
})(typeof self !== 'undefined' ? self : this, function () {

  // A small helper to throw errors that carry an HTTP status code.
  function fail(status, message) {
    const err = new Error(message);
    err.status = status;
    throw err;
  }

  // 6500 -> "GH₵65.00"
  function cedis(pesewas) {
    return 'GH₵' + (pesewas / 100).toFixed(2);
  }

  // Short random ids like "k3x9a2".
  function newId(prefix) {
    return prefix + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
  }

  // Accepts "024 123 4567", "+233241234567", "233241234567" and returns "0241234567".
  // Returns null if it doesn't look like a Ghana mobile number.
  function normalizePhone(raw) {
    if (!raw) return null;
    let d = String(raw).replace(/\D/g, '');
    if (d.startsWith('233') && d.length === 12) d = '0' + d.slice(3);
    if (d.length === 9) d = '0' + d;
    return /^0[235]\d{8}$/.test(d) ? d : null;
  }

  // "0241234567" -> "024 *** 4567" (used when showing a number back to a guest)
  function maskPhone(p) {
    return p ? p.slice(0, 3) + ' *** ' + p.slice(-4) : null;
  }

  function isToday(iso) {
    const d = new Date(iso), n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }

  // ---------- Loyalty ----------

  // Returns the guest's card (or an empty one) plus helpful numbers for the screen.
  function loyaltyCard(db, rawPhone) {
    const phone = normalizePhone(rawPhone);
    if (!phone) fail(400, 'Enter a valid Ghana mobile number, e.g. 024 123 4567');
    const needed = db.shop.loyalty.stampsNeeded;
    const card = db.loyalty[phone] || { stamps: 0, rewardsEarned: 0, rewardsUsed: 0, visits: 0 };
    return {
      phone: maskPhone(phone),
      stamps: card.stamps,
      needed: needed,
      rewardReady: card.stamps >= needed,
      rewardText: db.shop.loyalty.rewardText,
      visits: card.visits,
      isMember: !!db.loyalty[phone]
    };
  }

  // ---------- Orders ----------

  // Builds a new UNPAID order. Prices always come from the menu on our side,
  // never from the browser, so nobody can change a price in their browser.
  function createOrder(db, input) {
    const table = parseInt(input.table, 10);
    if (!(table >= 1 && table <= db.shop.tables)) fail(400, 'Unknown table number');
    if (!Array.isArray(input.items) || input.items.length === 0) fail(400, 'Your order is empty');

    const lines = input.items.map(function (it) {
      const item = db.menu.find(function (m) { return m.id === it.id; });
      if (!item) fail(400, 'Item not on the menu: ' + it.id);
      if (item.soldOut) fail(409, item.name + ' just sold out, sorry!');
      const qty = parseInt(it.qty, 10);
      if (!(qty >= 1 && qty <= 20)) fail(400, 'Bad quantity for ' + item.name);
      return { id: item.id, name: item.name, price: item.price, qty: qty };
    });
    const subtotal = lines.reduce(function (sum, l) { return sum + l.price * l.qty; }, 0);

    // Phone number is OPTIONAL. If given, the guest must tick the consent box (Act 843).
    let phone = null;
    if (input.phone) {
      phone = normalizePhone(input.phone);
      if (!phone) fail(400, 'Enter a valid Ghana mobile number, e.g. 024 123 4567');
      if (!input.consent) fail(400, 'Please tick the box to let us keep your number for stamps');
    }

    // Loyalty reward: the priciest item in the order is free (up to the cap, e.g. GH₵70).
    let discount = 0;
    if (input.useReward) {
      if (!phone || !(db.loyalty[phone] && db.loyalty[phone].stamps >= db.shop.loyalty.stampsNeeded)) {
        fail(400, 'No free reward on this number yet');
      }
      const priciest = Math.max.apply(null, lines.map(function (l) { return l.price; }));
      discount = Math.min(priciest, db.shop.loyalty.rewardCap);
    }

    const order = {
      id: newId('o'),
      reference: 'MK-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      table: table,
      lines: lines,
      subtotal: subtotal,
      discount: discount,
      total: subtotal - discount,          // in pesewas
      phone: phone,
      usedReward: discount > 0,
      paymentStatus: 'unpaid',             // unpaid -> paid (ONLY after the server checks with Paystack)
      kitchenStatus: 'new',                // new -> preparing -> ready -> served
      channel: null,
      demo: false,
      createdAt: new Date().toISOString(),
      paidAt: null
    };
    db.orders.unshift(order);

    // If the reward made the order free, there is nothing to pay.
    if (order.total === 0) markPaid(db, order.reference, { channel: 'reward', amount: 0 });
    return order;
  }

  // Marks an order as paid. Called by:
  //   - /api/verify after Paystack says "success"
  //   - /api/paystack-webhook after the signature check
  //   - demo mode
  // It is IDEMPOTENT: calling it twice for the same order does nothing the second time.
  // (Paystack can send the webhook AND the browser can call verify, so this matters.)
  function markPaid(db, reference, info) {
    const order = db.orders.find(function (o) { return o.reference === reference; });
    if (!order) fail(404, 'No order with that reference');
    if (order.paymentStatus === 'paid') return order;
    if (info.amount !== undefined && info.amount !== order.total) {
      fail(400, 'Amount paid (' + cedis(info.amount) + ') does not match the order (' + cedis(order.total) + ')');
    }

    order.paymentStatus = 'paid';
    order.paidAt = new Date().toISOString();
    order.channel = info.channel || 'mobile_money';
    order.network = info.network || null;
    order.demo = !!info.demo;

    // Loyalty: one stamp per paid order. Using the reward resets the card.
    if (order.phone) {
      const needed = db.shop.loyalty.stampsNeeded;
      const card = db.loyalty[order.phone] ||
        (db.loyalty[order.phone] = { name: '', stamps: 0, rewardsEarned: 0, rewardsUsed: 0, visits: 0, consentAt: order.paidAt });
      card.visits += 1;
      card.lastVisit = order.paidAt;
      if (order.usedReward) {
        card.stamps = 0;
        card.rewardsUsed += 1;
      } else if (card.stamps < needed) {
        card.stamps += 1;
        if (card.stamps === needed) card.rewardsEarned += 1;
      }
      order.stampsAfter = card.stamps;
    }

    // Show the guest a "leave us a Google review" prompt and count it.
    db.reviewPrompts.unshift({ orderId: order.id, table: order.table, at: order.paidAt, clicked: false });
    return order;
  }

  // What the guest's phone is allowed to see about an order (no full phone number).
  function publicOrder(db, id) {
    const o = db.orders.find(function (x) { return x.id === id; });
    if (!o) fail(404, 'Order not found');
    const copy = JSON.parse(JSON.stringify(o));
    copy.phone = maskPhone(o.phone);
    copy.stampsNeeded = db.shop.loyalty.stampsNeeded;
    return copy;
  }

  function reviewClicked(db, orderId) {
    const p = db.reviewPrompts.find(function (r) { return r.orderId === orderId; });
    if (p) p.clicked = true;
    return { ok: true };
  }

  // ---------- Waiter ----------

  function callWaiter(db, input) {
    const table = parseInt(input.table, 10);
    if (!(table >= 1 && table <= db.shop.tables)) fail(400, 'Unknown table number');
    const reason = ['waiter', 'bill', 'water'].indexOf(input.reason) >= 0 ? input.reason : 'waiter';
    // Don't stack the same call twice from one table.
    const open = db.waiterCalls.find(function (c) { return c.table === table && !c.done && c.reason === reason; });
    if (open) return open;
    const call = { id: newId('w'), table: table, reason: reason, at: new Date().toISOString(), done: false };
    db.waiterCalls.unshift(call);
    return call;
  }

  // ---------- Owner dashboard ----------

  const KITCHEN_STEPS = ['new', 'preparing', 'ready', 'served'];

  function setKitchenStatus(db, id, status) {
    const o = db.orders.find(function (x) { return x.id === id; });
    if (!o) fail(404, 'Order not found');
    if (KITCHEN_STEPS.indexOf(status) < 0) fail(400, 'Unknown status');
    if (o.paymentStatus !== 'paid' && status !== 'new') fail(409, 'This order is not paid yet');
    o.kitchenStatus = status;
    return o;
  }

  function updateMenuItem(db, id, patch) {
    const item = db.menu.find(function (m) { return m.id === id; });
    if (!item) fail(404, 'Item not found');
    if (patch.price !== undefined) {
      const p = Math.round(Number(patch.price));
      if (!(p >= 100 && p <= 1000000)) fail(400, 'Price must be between GH₵1 and GH₵10,000');
      item.price = p;
    }
    if (patch.soldOut !== undefined) item.soldOut = !!patch.soldOut;
    return item;
  }

  function waiterDone(db, id) {
    const c = db.waiterCalls.find(function (x) { return x.id === id; });
    if (!c) fail(404, 'Call not found');
    c.done = true;
    return c;
  }

  function summary(db) {
    const today = db.orders.filter(function (o) { return isToday(o.createdAt); });
    const paidToday = today.filter(function (o) { return o.paymentStatus === 'paid'; });
    const prompts = db.reviewPrompts.filter(function (r) { return isToday(r.at); });
    return {
      shop: db.shop,
      menu: db.menu,
      orders: db.orders.slice(0, 100),
      waiterCalls: db.waiterCalls.filter(function (c) { return !c.done; }),
      loyalty: Object.keys(db.loyalty).map(function (phone) {
        return Object.assign({ phone: phone }, db.loyalty[phone]);
      }).sort(function (a, b) { return (b.lastVisit || '').localeCompare(a.lastVisit || ''); }),
      stats: {
        salesToday: paidToday.reduce(function (s, o) { return s + o.total; }, 0),
        paidOrdersToday: paidToday.length,
        unpaidOrdersToday: today.length - paidToday.length,
        openWaiterCalls: db.waiterCalls.filter(function (c) { return !c.done; }).length,
        reviewPromptsToday: prompts.length,
        reviewClicksToday: prompts.filter(function (r) { return r.clicked; }).length,
        reviewPromptsTotal: db.reviewPrompts.length,
        reviewClicksTotal: db.reviewPrompts.filter(function (r) { return r.clicked; }).length,
        members: Object.keys(db.loyalty).length
      },
      reviewPrompts: db.reviewPrompts.slice(0, 50)
    };
  }

  // The public "shop info + menu" the guest page needs.
  function publicShop(db) {
    return { shop: db.shop, categories: db.categories, menu: db.menu };
  }

  return {
    cedis, normalizePhone, maskPhone, loyaltyCard, createOrder, markPaid, publicOrder,
    reviewClicked, callWaiter, setKitchenStatus, updateMenuItem, waiterDone, summary, publicShop
  };
});
