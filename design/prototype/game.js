// "Play while you wait": Plate Stack. A one-tap skill game for every guest.
// Tap to drop the sliding plate onto the stack; whatever hangs over is cut off. Miss completely and it's over.
// Offline, no ads, no tracking. The only thing saved is an optional nickname + score, in this browser.
window.PlateStack = (function () {
  const W = 358, H = 380, PH = 22, BASE = 210;
  let raf = 0, g = null, cfg = null, vk = '', venue = null, opts = {};
  const key = k => 'cravins:' + vk + ':' + k;
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(key(k))) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(key(k), JSON.stringify(v)); } catch {} };
  const SAMPLE = [{ n: 'Kwame', s: 23, sample: 1 }, { n: 'Ama', s: 19, sample: 1 }, { n: 'Yaw', s: 16, sample: 1 }, { n: 'Esi', s: 12, sample: 1 }, { n: 'Kojo', s: 9, sample: 1 }];
  const board = () => [...load('board', []), ...SAMPLE].sort((a, b) => b.s - a.s).slice(0, 5);
  const css = getComputedStyle(document.documentElement);
  const col = n => css.getPropertyValue(n).trim();

  function html(v) {
    const G = v.game;
    return `<div class="row" style="justify-content:space-between;margin-bottom:10px">
      <div><div class="lbl2">Score</div><div class="disp" id="gs" style="font-size:28px;line-height:34px">0</div></div>
      <div style="text-align:center">${G.stampReward ? `<span class="pill" id="gtarget">${icon('gift', 12)} Score ${G.stampScore}+ for a stamp</span>` : ''}</div>
      <div style="text-align:right"><div class="lbl2">Your best</div><div class="disp" id="gb" style="font-size:28px;line-height:34px">${load('best', 0)}</div></div></div>
    <div id="gwrap" style="position:relative;width:${W}px;height:${H}px;border-radius:20px;overflow:hidden;background:var(--g100);touch-action:manipulation;user-select:none">
      <canvas id="gc" width="${W * 2}" height="${H * 2}" style="width:${W}px;height:${H}px;display:block"></canvas>
      <div id="gov" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px"></div>
    </div>
    <div id="glb" style="margin-top:14px"></div>
    <p class="meta" style="margin:10px 0 0;display:flex;gap:6px;align-items:center">${icon('shield', 14)}No ads. Works offline. Only a nickname you choose is saved.</p>`;
  }
  function lb() {
    const el = document.getElementById('glb'); if (!el) return;
    el.innerHTML = `<div class="row" style="justify-content:space-between"><b class="disp" style="font-size:15px">Top scores at ${venue.name}</b><span class="meta">This week</span></div>` +
      board().map((r, i) => `<div class="row" style="gap:10px;padding:7px 0;${i ? 'border-top:1px solid var(--g200)' : ''}"><span style="width:20px;font-weight:600;color:${i ? 'var(--g500)' : 'var(--accent-ink)'}">${i + 1}</span>${i === 0 ? `<span style="color:var(--accent-ink)">${icon('trophy', 16)}</span>` : ''}<span style="flex:1;font-weight:600">${r.n}${r.sample ? ' <span class="meta" style="font-weight:400">sample</span>' : r.me ? ' <span class="meta" style="font-weight:400">you</span>' : ''}</span><b>${r.s}</b></div>`).join('');
  }
  function overlay(kind) {
    const o = document.getElementById('gov'); if (!o) return;
    o.style.pointerEvents = kind ? 'auto' : 'none';
    if (!kind) { o.innerHTML = ''; o.style.background = 'none'; return; }
    o.style.background = 'rgba(255,255,255,.92)';
    if (kind === 'start') o.innerHTML = `<div class="disp" style="font-size:24px;line-height:30px">Plate Stack</div><p class="cap" style="margin:8px 0 18px;max-width:250px">Tap to drop the plate. Line it up with the one below. Whatever hangs over falls off.</p><button class="btn" id="gstart" style="width:200px">Tap to start</button>`;
    else {
      const G = cfg, newBest = g.score > 0 && g.score >= load('best', 0), stamp = g.stamp;
      o.innerHTML = `<div class="lbl2">${newBest ? 'New best!' : 'Game over'}</div><div class="disp" style="font-size:56px;line-height:64px">${g.score}</div>
      ${stamp ? `<div class="pill" style="height:28px;line-height:28px;font-size:13px;margin:4px 0 8px">${icon('gift', 13)} You earned a loyalty stamp</div>` : G.stampReward ? `<p class="cap" style="margin:4px 0 8px">Score ${G.stampScore}+ to earn a loyalty stamp</p>` : ''}
      <div style="display:flex;gap:8px;width:100%;margin-top:10px"><input id="gnick" maxlength="14" placeholder="Nickname (optional)" value="${load('nick', '')}" style="flex:1;height:48px;border:1px solid var(--g200);border-radius:12px;padding:0 12px;font:inherit;min-width:0"><button class="btn2" id="gsave" style="width:96px;height:48px">Save</button></div>
      <button class="btn" id="gagain" style="margin-top:10px">Play again</button>`;
    }
  }
  function reset() {
    g = { state: 'ready', score: 0, perfect: 0, stack: [{ x: (W - BASE) / 2, w: BASE }], cur: null, dir: 1, falling: [], cam: 0, stamp: false, t: performance.now() };
    spawn();
  }
  function spawn() {
    const p = g.stack[g.stack.length - 1];
    g.cur = { x: g.dir > 0 ? p.x - p.w - 8 : p.x + p.w + 8, w: p.w }; g.dir *= -1;
  }
  const speed = () => Math.min(150 + g.score * 11, 420);
  function drop() {
    if (g.state === 'ready') { g.state = 'play'; overlay(null); return; }
    if (g.state !== 'play') return;
    const p = g.stack[g.stack.length - 1], c = g.cur;
    const l = Math.max(p.x, c.x), r = Math.min(p.x + p.w, c.x + c.w), ov = r - l;
    if (ov <= 0) { g.falling.push({ x: c.x, w: c.w, y: g.stack.length, vy: 0 }); g.cur = null; return over(); }
    if (Math.abs(c.x - p.x) < 4) { c.x = p.x; g.perfect++; if (g.perfect % 3 === 0) { c.w = Math.min(BASE, c.w + 10); c.x = Math.max(0, c.x - 5); } }
    else { g.perfect = 0; const cutX = c.x < p.x ? c.x : r; g.falling.push({ x: cutX, w: c.w - ov, y: g.stack.length, vy: 0 }); c.x = l; c.w = ov; }
    g.stack.push({ x: c.x, w: c.w, perfect: g.perfect > 0 }); g.score++;
    const s = document.getElementById('gs'); if (s) s.textContent = g.score;
    if (cfg.stampReward && g.score >= cfg.stampScore && !g.stamp && !load('stampToday', false)) { g.stamp = true; save('stampToday', true); venue.loyalty.have = Math.min(venue.loyalty.need, venue.loyalty.have + 1); const tg = document.getElementById('gtarget'); if (tg) tg.innerHTML = icon('check', 12, 3) + ' Stamp earned'; }
    spawn();
  }
  function over() {
    g.state = 'over';
    const best = Math.max(load('best', 0), g.score); save('best', best);
    const b = document.getElementById('gb'); if (b) b.textContent = best;
    setTimeout(() => { overlay('over'); wire(); }, 500);
  }
  function wire() {
    const s = document.getElementById('gsave'), a = document.getElementById('gagain'), st = document.getElementById('gstart');
    if (st) st.onclick = e => { e.stopPropagation(); drop(); };
    if (a) a.onclick = e => { e.stopPropagation(); reset(); g.state = 'play'; overlay(null); document.getElementById('gs').textContent = 0; };
    if (s) s.onclick = e => { e.stopPropagation(); const n = document.getElementById('gnick').value.trim().slice(0, 14); if (!n) return; save('nick', n);
      const bd = load('board', []).filter(r => r.n !== n || r.s > g.score); if (!bd.some(r => r.n === n && r.s >= g.score)) bd.push({ n, s: g.score, me: 1 }); save('board', bd); lb(); s.textContent = 'Saved'; };
  }
  function draw(now) {
    const cv = document.getElementById('gc'); if (!cv) return;
    const x = cv.getContext('2d'), dt = Math.min(0.05, (now - g.t) / 1000); g.t = now;
    const acc = col('--accent') || '#D24000', ink = '#111111';
    if (g.state === 'play' && g.cur) { g.cur.x -= g.dir * speed() * dt; // dir -1 moves right, 1 moves left
      // it travels until it fully clears the stack on each side, so a total miss is always possible
      const p = g.stack[g.stack.length - 1], lo = p.x - g.cur.w - 8, hi = p.x + p.w + 8;
      if (g.cur.x > hi) { g.cur.x = hi; g.dir = 1; } if (g.cur.x < lo) { g.cur.x = lo; g.dir = -1; } }
    const topY = g.stack.length * PH, want = Math.max(0, topY - H * 0.55); g.cam += (want - g.cam) * Math.min(1, dt * 8);
    x.setTransform(2, 0, 0, 2, 0, 0); x.clearRect(0, 0, W, H);
    const Y = i => H - 30 - (i + 1) * PH + g.cam;
    // table edge
    x.fillStyle = '#E4E4E7'; x.fillRect(0, Y(-1) + PH, W, 400);
    const plate = (px, i, w, fill, rim) => { const y = Y(i); x.fillStyle = 'rgba(0,0,0,.06)'; rr(x, px + 2, y + 4, w, PH - 4, 8); x.fill();
      x.fillStyle = fill; rr(x, px, y, w, PH - 4, 8); x.fill(); x.strokeStyle = ink; x.lineWidth = 1.5; rr(x, px, y, w, PH - 4, 8); x.stroke();
      x.fillStyle = rim; rr(x, px + 6, y + 4, Math.max(0, w - 12), 3, 1.5); x.fill(); };
    g.stack.forEach((p, i) => plate(p.x, i, p.w, '#FFFFFF', i === 0 ? '#D4D4D8' : acc));
    g.falling.forEach(f => { f.vy += 900 * dt; f.y -= f.vy * dt / PH; plate(f.x, f.y, f.w, '#FFFFFF', '#D4D4D8'); });
    g.falling = g.falling.filter(f => Y(f.y) < H + 40);
    if (g.cur && g.state !== 'over') plate(g.cur.x, g.stack.length, g.cur.w, acc, '#FFFFFF');
    window.__game = { state: g.state, score: g.score, cur: g.cur && { x: g.cur.x, w: g.cur.w }, prev: { ...g.stack[g.stack.length - 1] }, stamp: g.stamp };
    raf = requestAnimationFrame(draw);
  }
  function rr(x, a, b, w, h, r) { x.beginPath(); x.roundRect ? x.roundRect(a, b, w, h, r) : x.rect(a, b, w, h); }
  function mount(v, k, o) {
    venue = v; vk = k; cfg = v.game; opts = o || {}; reset();
    const qs = new URLSearchParams(location.search);
    // demo states for screenshots: ?gstate=play&gscore=11  or  ?gstate=over&gscore=17
    if (qs.get('gstate')) { const n = +(qs.get('gscore') || 0); g.state = 'play'; for (let i = 0; i < n; i++) { const p = g.stack[g.stack.length - 1]; const j = (i % 3 === 1) ? 6 : 0; g.cur.x = p.x + j; drop(); } if (qs.get('gstate') === 'over') { g.cur = null; g.state = 'over'; save('best', Math.max(load('best', 0), g.score)); overlay('over'); wire(); } else { overlay(null); g.cur.x = g.stack[g.stack.length - 1].x + 46; } g.falling = []; g.cam = Math.max(0, g.stack.length * PH - H * 0.55); document.getElementById('gs').textContent = g.score; document.getElementById('gb').textContent = load('best', 0); }
    else { overlay('start'); wire(); }
    const wrap = document.getElementById('gwrap');
    wrap.addEventListener('pointerdown', e => { if (e.target.closest('button,input')) return; e.preventDefault(); drop(); });
    addEventListener('keydown', onKey); lb();
    raf = requestAnimationFrame(t => { g.t = t; draw(t); });
  }
  const onKey = e => { if (e.code === 'Space') { e.preventDefault(); drop(); } };
  function unmount() { cancelAnimationFrame(raf); removeEventListener('keydown', onKey); }
  return { html, mount, unmount };
})();
