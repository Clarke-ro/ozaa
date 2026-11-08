// Cravins v5 guest app: one page, hash routes. index.html?venue=mamas#home
// Routes: home, story/<id>, menu, wifi, waiter, waiter/sent, loyalty, review, review/record, play, status, pay
(function () {
const q = new URLSearchParams(location.search);
const vk = q.get('venue') || 'mamas';
const v = VENUES[vk];
if (q.get('accent')) v.accent = q.get('accent') === 'none' ? null : q.get('accent');
const t = CravinsTheme.deriveTheme(v.accent); CravinsTheme.applyTheme(t);
const root = document.documentElement.style;
root.setProperty('--ring2', t.isDefault ? '#FC5205' : `color-mix(in srgb, ${t.fill} 55%, #FFB000)`);
const fp = FONT_PAIRS[v.font] || FONT_PAIRS.cravins;
root.setProperty('--display', `"${fp.display}"`); root.setProperty('--display-weight', fp.weight);
const ced = n => 'GH₵' + (Number.isInteger(n) ? n : n.toFixed(2));
const app = document.getElementById('app');
const sb = document.getElementById('sb');
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem('cravins:' + vk + ':' + k)) ?? d; } catch { return d; } };
const SS = (k, val) => { try { localStorage.setItem('cravins:' + vk + ':' + k, JSON.stringify(val)); } catch {} };
const starRow = (n, size = 14) => `<span class="stars">${Array.from({ length: 5 }, (_, i) => icon('star', size, 1.5, i < n ? '#FFC21A' : 'rgba(255,255,255,.4)')).join('')}</span>`;
const go = r => { location.hash = r; };
const back = (to = 'home') => `<button class="iconbtn" data-go="${to}" aria-label="Back">${icon('back', 22)}</button>`;
const top = (title, sub, right = '<span class="iconbtn"></span>', to) => `<div class="top">${back(to)}<div class="t">${title}${sub ? `<small>${sub}</small>` : ''}</div>${right}</div>`;
const svc = id => SERVICES[id];
const on = id => v.services.includes(id);
const order = ORDER;
const it = i => v.items[i % v.items.length];
const orderTotal = () => order.items.reduce((s, o) => s + it(o.i).p * o.q, 0);
const toast = msg => { const el = document.getElementById('toast'); el.innerHTML = icon('check', 16) + msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 1800); };
// seen stories (sample default: the last two are watched)
const seen = new Set(LS('seen', v.stories.slice(-2).map(s => s.id)));

/* ---------- HOME ---------- */
function home() {
  const secs = SERVICE_SECTIONS.map(sec => {
    const ids = v.services.filter(id => svc(id).sec === sec.id);
    if (!ids.length) return '';
    const sub = id => id === 'loyalty' ? `${v.loyalty.have} of ${v.loyalty.need} stamps` : id === 'offers' && v.offerNote ? v.offerNote : id === 'status' ? `Order #${order.no} · being prepared` : svc(id).s;
    if (sec.id === 'table') {
      return `<div class="sechd"><h2 class="disp">${sec.title}</h2></div><div class="grid2">${ids.map((id, i) => {
        const wide = ids.length % 2 === 1 && i === 0;
        return `<button class="card ${wide ? 'wide' : ''}" data-go="${id}"><span class="ic">${icon(svc(id).icon, 22)}</span>${wide ? `<span style="flex:1;margin:0"><b style="display:block">${svc(id).t}</b><span style="display:block">${sub(id)}</span></span>` : `<b>${svc(id).t}</b><span>${sub(id)}</span>`}<span class="ch">${icon('chevron', 18)}</span></button>`;
      }).join('')}</div>`;
    }
    return `<div class="sechd"><h2 class="disp">${sec.title}</h2></div><div class="list">${ids.map(id => `<button class="li" data-go="${id}"><span class="ic">${icon(svc(id).icon, 22)}</span><span class="tx"><b>${svc(id).t}</b><span>${sub(id)}</span></span>${id === 'play' && v.game.stampReward ? `<span class="pill">Win a stamp</span>` : ''}<span class="ch">${icon('chevron', 18)}</span></button>`).join('')}</div>`;
  }).join('');
  const stories = v.stories.length ? `<div class="sechd"><h2 class="disp">Guests are saying</h2><span class="sample">Sample videos</span></div>
  <div class="stories">${v.stories.map(s => `<button class="st" data-go="story/${s.id}"><span class="ring ${seen.has(s.id) ? 'seen' : ''}"><img src="${s.av}" alt=""></span><span class="nm2">${s.name}</span><span class="rt">${icon('star', 11, 0)}${s.stars}.0</span></button>`).join('')}</div>` : '';
  return `<div class="screen" id="scr">
<div class="banner" style="background-image:url(${v.banner})">
  <div class="fab" style="left:16px">${icon('share', 18)}</div>
  <div class="fab" style="right:16px">${icon('globe', 16)}${v.lang === 'TWI' ? 'Twi' : 'English'}</div>
  <div class="logo">${venueLogo(v, t, 76)}</div>
</div>
<div class="id" style="position:relative">
  <span class="tablepill" style="top:12px">${icon('utensils', 14)}Table ${v.table}</span>
  <h1 class="disp" style="${v.name.length > 16 ? 'font-size:22px;line-height:28px' : ''}">${v.name}</h1>
  <p class="about">${v.about}</p>
  <div class="facts">
    <div class="row">${icon('pin', 16, 2, '#71717A')}<span>${v.place}</span></div>
    <div class="row"><span class="dot"></span><span><span class="open">${v.open}</span> · ${v.until}</span></div>
  </div>
</div>
${stories}
${secs}
<div class="powered"><img src="img/cravins-icon-small.svg" width="16" height="16" alt="">Powered by Cravins</div>
</div>
<div class="compact" id="compact"><div style="width:36px;height:36px;border-radius:50%;overflow:hidden;flex:none">${venueLogo(v, t, 36)}</div><b>${v.name}</b><span class="meta">Table ${v.table}</span></div>
${on('status') ? `<div class="bar"><button class="obar" data-go="status"><span class="pulse"></span><span style="flex:1"><b>Order #${order.no} · Being prepared</b><span>About ${order.eta} min · ${order.items.length} items</span></span>${icon('chevron', 18)}</button></div>` : ''}`;
}
function homeMount() {
  const scr = document.getElementById('scr'), cp = document.getElementById('compact');
  const f = () => { const s = scr.scrollTop > 300; cp.classList.toggle('show', s); sb.innerHTML = statusBar(s); };
  scr.addEventListener('scroll', f);
  if (q.get('scroll')) { cp.style.transition = 'none'; scr.scrollTop = +q.get('scroll'); }
  f();
}

/* ---------- STORY VIEWER ---------- */
function story(id) {
  const i = Math.max(0, v.stories.findIndex(s => s.id === id)), s = v.stories[i], d = it(s.dish);
  return `<div class="story" id="story">
  ${s.video ? `<video class="media" id="sv" src="${s.video}" poster="${s.poster}" autoplay muted playsinline></video>` : `<img class="media" src="${s.poster}" alt="">`}
  <div class="shade"></div>
  <div class="prog">${v.stories.map((x, j) => `<i><b style="width:${j < i ? 100 : 0}%"></b></i>`).join('')}</div>
  <div class="shd"><img src="${s.av}" alt=""><div class="who"><b>${s.name}</b><span>${s.ago}</span></div><span class="sample">${s.video ? 'Sample video' : 'Sample still'}</span><button class="iconbtn" data-go="home" aria-label="Close">${icon('x', 24, 2.4, '#fff')}</button></div>
  <button class="tapL" id="tl" aria-label="Previous"></button><button class="tapR" id="tr" aria-label="Next"></button>
  <div class="sbot">
    ${starRow(s.stars, 18)}
    <p class="quote">“${s.quote}”</p>
    <div class="dish"><img src="${d.img}" alt=""><div class="tx"><span>${s.name} ordered</span><b>${d.n}</b><span>${ced(d.p)}</span></div><button class="btn" id="addd">${icon('plus', 16, 2.6)}Add to order</button></div>
    <div class="swipe">Swipe down to close</div>
  </div></div>`;
}
function storyMount(id) {
  const i = Math.max(0, v.stories.findIndex(s => s.id === id)), s = v.stories[i];
  seen.add(s.id); SS('seen', [...seen]);
  sb.innerHTML = statusBar(false);
  const bar = document.querySelectorAll('.prog b')[i], vid = document.getElementById('sv');
  const next = () => go(i + 1 < v.stories.length ? 'story/' + v.stories[i + 1].id : 'home');
  const prev = () => go(i > 0 ? 'story/' + v.stories[i - 1].id : 'story/' + s.id);
  document.getElementById('tr').onclick = next; document.getElementById('tl').onclick = prev;
  document.getElementById('addd').onclick = e => { e.stopPropagation(); toast(it(s.dish).n + ' added'); };
  const dur = 6000, t0 = performance.now();
  const freeze = q.get('freeze');
  const tick = () => { if (!document.body.contains(bar)) return;
    const p = freeze ? +freeze : vid && vid.duration ? vid.currentTime / vid.duration : (performance.now() - t0) / dur;
    bar.style.width = Math.min(100, p * 100) + '%';
    if (!freeze && p >= 1) return next(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  // swipe down to close
  const el = document.getElementById('story'); let y0 = null, dy = 0;
  el.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; });
  el.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); el.style.transform = `translateY(${dy}px) scale(${1 - dy / 2000})`; });
  el.addEventListener('pointerup', () => { if (dy > 120) go('home'); else el.style.transform = ''; y0 = null; });
}

/* ---------- MENU (the v4 menu) ---------- */
function menu() {
  return `${top('Menu', v.name, `<span class="iconbtn">${icon('search', 22)}</span>`)}
  <div class="screen" style="padding-top:104px">
  <div class="tabs" style="margin-top:6px"><span class="tab on">Food</span><span class="tab">Drinks</span></div>
  <div class="chips">${v.cats.map((c, i) => `<span class="chip ${i ? '' : 'on'}">${c}</span>`).join('')}</div>
  <div class="diet"><span class="lbl">Show only</span>${['Vegetarian', 'Vegan', 'Gluten free', 'Halal'].map(d => `<span class="dchip">${d}</span>`).join('')}</div>
  <h2 class="sec disp">${v.section}</h2>
  ${v.items.map(it => `<div class="item"><div class="txt"><div class="nm">${it.n}${it.pop ? '<span class="badge">Popular</span>' : ''}</div><div class="desc">${it.d}</div><div class="price">${ced(it.p)}</div></div><div class="thumb"><img src="${it.img}" alt=""><button class="add" data-toast="${it.n} added">${icon('plus', 18, 2.6)}</button></div></div>`).join('')}
  </div>
  <div class="bar"><button class="btn split" data-go="status"><span class="row"><span class="n">${order.items.reduce((s, o) => s + o.q, 0)}</span>View order</span><span>${ced(orderTotal())}.00</span></button></div>`;
}

/* ---------- WI-FI ---------- */
function qrSvg(text, px) {
  const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), m = 2, s = px / (n + m * 2); let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${((c + m) * s).toFixed(2)} ${((r + m) * s).toFixed(2)}h${s.toFixed(2)}v${s.toFixed(2)}h-${s.toFixed(2)}z`;
  return `<svg class="qr" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}"><path d="${d}" fill="#111"/></svg>`;
}
function wifi() {
  const w = v.wifi, esc = x => x.replace(/([\\;,:"])/g, '\\$1');
  return `${top('Wi-Fi', v.name)}<div class="screen"><div class="body">
  <h2 class="h2 disp">Free Wi-Fi</h2><p class="lead">Copy the password, then pick the network in your phone's Wi-Fi settings.</p>
  <div class="box" style="margin-top:18px;padding:0">
    <div style="padding:14px 16px;display:flex;align-items:center;gap:12px"><span class="ic" style="width:40px;height:40px;border-radius:12px;background:var(--g100);display:flex;align-items:center;justify-content:center;color:var(--accent-ink)">${icon('wifi', 22)}</span><div style="flex:1"><div class="lbl2">Network</div><div class="val">${w.ssid}</div></div></div>
    <div style="border-top:1px solid var(--g200);padding:14px 16px;display:flex;align-items:center;gap:12px"><span class="ic" style="width:40px;height:40px;border-radius:12px;background:var(--g100);display:flex;align-items:center;justify-content:center;color:var(--accent-ink)">${icon('lock', 20)}</span><div style="flex:1"><div class="lbl2">Password</div><div class="val" style="letter-spacing:.5px">${w.pass}</div></div><button class="copy" id="cp">${icon('copy', 16)}Copy</button></div>
  </div>
  <div class="box" style="margin-top:14px;text-align:center">
    <div style="font-weight:600">Connect with a QR code</div>
    <p class="cap" style="margin:4px 0 10px">Show this to a friend. Their camera joins the network in one tap.</p>
    ${qrSvg(`WIFI:T:${w.sec};S:${esc(w.ssid)};P:${esc(w.pass)};;`, 176)}
  </div>
  <p class="meta" style="margin-top:14px;display:flex;gap:6px;align-items:center">${icon('shield', 14)}Guest network. ${v.name} never sees what you browse.</p>
  </div></div>
  <div class="bar"><button class="btn" id="cp2">${icon('copy', 18)}Copy password</button></div>`;
}
function wifiMount() {
  const c = () => { navigator.clipboard?.writeText(v.wifi.pass).catch(() => {}); toast('Password copied'); };
  document.getElementById('cp').onclick = c; document.getElementById('cp2').onclick = c;
}

/* ---------- CALL WAITER ---------- */
const REASONS = [['droplet', 'Water'], ['receipt', 'The bill'], ['utensils', 'Cutlery'], ['plus', 'Order more'], ['sparkle', 'Clean the table'], ['help', 'Something else']];
function waiter() {
  const pick = new Set(LS('reasons', ['Water', 'The bill']));
  return `${top('Call waiter', `Table ${v.table}`)}<div class="screen"><div class="body">
  <h2 class="h2 disp">What do you need?</h2><p class="lead">Pick one or more. Your waiter gets it on their phone.</p>
  <div class="reasons">${REASONS.map(([ic, l]) => `<button class="reason ${pick.has(l) ? 'on' : ''}" data-r="${l}">${icon(ic, 24)}${l}<span class="tick">${icon('check', 14, 3)}</span></button>`).join('')}</div>
  <div class="note">Add a note (optional)</div>
  </div></div>
  <div class="bar"><button class="btn" id="send">${icon('bell', 18)}Call waiter</button></div>`;
}
function waiterMount() {
  const pick = new Set(LS('reasons', ['Water', 'The bill'])), b = document.getElementById('send');
  const upd = () => { b.disabled = !pick.size; SS('reasons', [...pick]); };
  document.querySelectorAll('.reason').forEach(el => el.onclick = () => { const r = el.dataset.r; pick.has(r) ? pick.delete(r) : pick.add(r); el.classList.toggle('on'); upd(); });
  b.onclick = () => go('waiter/sent'); upd();
}
function waiterSent() {
  const pick = LS('reasons', ['Water', 'The bill']);
  return `${top('Call waiter', `Table ${v.table}`)}<div class="screen"><div class="body" style="text-align:center;padding-top:150px">
  <div class="ring2"><i>${icon('check', 36, 3)}</i></div>
  <h2 class="h2 disp" style="margin-top:28px">Kwesi is on the way</h2>
  <p class="lead">Usually under 3 minutes. We'll let you know if it takes longer.</p>
  <div class="box" style="margin-top:22px;text-align:left"><div class="lbl2">You asked for</div>${pick.map(p => `<div class="row" style="gap:10px;margin-top:8px;font-weight:600"><span style="color:var(--accent-ink)">${icon(REASONS.find(r => r[1] === p)[0], 18)}</span>${p}</div>`).join('')}<div class="meta" style="margin-top:10px">Sent 12:52</div></div>
  ${on('play') ? `<button class="vcard" data-go="play"><span class="ic">${icon('game', 24)}</span><span style="flex:1"><b style="display:block">Play while you wait</b><span class="cap">A quick game. Can you beat the top score here?</span></span>${icon('chevron', 18)}</button>` : ''}
  </div></div>
  <div class="bar"><button class="btn2" data-go="waiter">Cancel request</button></div>`;
}

/* ---------- LOYALTY ---------- */
function loyalty() {
  const L = v.loyalty, left = L.need - L.have;
  return `${top('Loyalty card', v.name)}<div class="screen"><div class="body">
  <div class="lcard">
    <div class="row" style="gap:10px"><span class="lg">${venueLogo(v, t, 36)}</span><div style="flex:1;line-height:18px"><b>${v.name}</b><div style="font-size:12px;opacity:.85">${L.member}</div></div><b style="font-size:22px">${L.have}/${L.need}</b></div>
    <div class="stamps">${Array.from({ length: L.need }, (_, i) => `<span class="stamp ${i < L.have ? 'on' : ''}">${i < L.have ? icon('utensils', 20, 2.2) : i === L.need - 1 ? icon('gift', 20) : ''}</span>`).join('')}</div>
    <div style="margin-top:16px;font-weight:600">${left} more ${left === 1 ? 'stamp' : 'stamps'} for ${L.reward.toLowerCase()}</div>
  </div>
  <h3 class="disp" style="font-size:17px;margin:24px 0 4px">Your rewards</h3>
  <div class="rw"><span class="ic">${icon('gift', 20)}</span><span class="tx"><b>Free sobolo</b><span>Unlocked at 4 stamps. Show this to your waiter.</span></span><span class="pill">Ready</span></div>
  <div class="rw"><span class="ic">${icon('gift', 20)}</span><span class="tx"><b>${L.reward}</b><span>At ${L.need} stamps</span><div class="bar2" style="margin-top:8px"><b style="width:${L.have / L.need * 100}%"></b></div></span></div>
  <h3 class="disp" style="font-size:17px;margin:20px 0 4px">How to earn stamps</h3>
  <div class="rw"><span class="ic">${icon('receipt', 20)}</span><span class="tx"><b>1 stamp per visit</b><span>When you spend GH₵50 or more</span></span></div>
  ${v.game.stampReward ? `<div class="rw"><span class="ic">${icon('game', 20)}</span><span class="tx"><b>Score ${v.game.stampScore}+ in Play while you wait</b><span>Once per visit</span></span></div>` : ''}
  <div class="rw"><span class="ic">${icon('star', 20)}</span><span class="tx"><b>Leave a review</b><span>Once per visit</span></span></div>
  </div></div>`;
}

/* ---------- REVIEW ---------- */
function review() {
  return `${top('Leave a review', v.name)}<div class="screen"><div class="body">
  <h2 class="h2 disp" style="text-align:center">How was your meal?</h2>
  <div class="bigstars" id="bs">${[1, 2, 3, 4, 5].map(n => `<button class="${n <= 4 ? 'on' : ''}" data-n="${n}">${icon('star', 40, 1)}</button>`).join('')}</div>
  <p class="cap" style="text-align:center">Really good</p>
  <div style="font-weight:600;margin:20px 0 10px">What stood out?</div>
  <div style="display:flex;flex-wrap:wrap;gap:8px">${['Food', 'Service', 'Speed', 'Value', 'Vibe'].map((c, i) => `<span class="chip ${i === 0 || i === 3 ? 'on' : ''}">${c}</span>`).join('')}</div>
  <div style="font-weight:600;margin:20px 0 10px">Tell us more (optional)</div>
  <div class="ta">The jollof was smoky and the chicken was well spiced. Good portion for the price.</div>
  <button class="vcard" data-go="review/record"><span class="ic">${icon('video', 24)}</span><span style="flex:1"><b style="display:block">Or record a video review</b><span class="cap">15 to 30 seconds. ${v.name} can show it in their stories, only if you say yes.</span></span>${icon('chevron', 18)}</button>
  </div></div>
  <div class="bar"><button class="btn" data-toast="Thanks! Review posted" data-go2="home">Post review</button></div>`;
}
function reviewMount() {
  document.querySelectorAll('#bs button').forEach(b => b.onclick = () => document.querySelectorAll('#bs button').forEach(x => x.classList.toggle('on', +x.dataset.n <= +b.dataset.n)));
}
function reviewRecord() {
  const s = +(q.get('sec') || 0);
  return `<div class="rec" id="rec">
  <img class="prev" id="prev" src="img/story-efua.jpg" alt=""><video id="cam" autoplay muted playsinline style="display:none"></video>
  <div class="shade"></div>
  <div class="rtop"><button class="iconbtn" data-go="review" aria-label="Close" style="background:rgba(0,0,0,.35)">${icon('x', 22, 2.4, '#fff')}</button><span class="timer" id="tm"><i></i><span id="tmt">0:${String(s).padStart(2, '0')}</span> / 0:30</span><span class="sample" id="camlbl" style="background:rgba(0,0,0,.45);color:#fff">Sample camera view</span></div>
  <div class="hint" id="hint">${s ? (s < 15 ? `Keep going, ${15 - s} s to go` : 'Looking good. Stop any time') : 'Say what you ordered and what you loved'}</div>
  <div class="rbot">
    <button class="consent" id="cons"><span class="cbox on" id="cb">${icon('check', 14, 3, '#111')}</span><span><b>${v.name} can feature this video in their stories.</b> Only your first name and rating are shown. You can remove it any time.</span></button>
    <div class="rctl">
      <div class="side"><span class="iconbtn">${icon('flip', 22, 2, '#fff')}</span>Flip</div>
      <button class="rbtn ${s ? 'on' : ''}" id="rb" aria-label="Record"><svg class="ringsvg" width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="38" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="5"/><circle id="arc" cx="42" cy="42" r="38" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * 38).toFixed(1)}" stroke-dashoffset="${(2 * Math.PI * 38 * (1 - s / 30)).toFixed(1)}" transform="rotate(-90 42 42)"/></svg><i></i></button>
      <button class="side" id="done" style="opacity:${s >= 15 ? 1 : .4}"><span class="iconbtn" style="background:${s >= 15 ? 'var(--accent)' : 'rgba(255,255,255,.18)'}">${icon('check', 22, 2.6, '#fff')}</span>Done</button>
    </div>
  </div></div>`;
}
function reviewRecordMount() {
  sb.innerHTML = statusBar(false);
  const C = 2 * Math.PI * 38; let sec = +(q.get('sec') || 0), timer = null, rec = null, consent = true;
  const ui = () => { document.getElementById('tmt').textContent = '0:' + String(sec).padStart(2, '0');
    document.getElementById('arc').setAttribute('stroke-dashoffset', (C * (1 - sec / 30)).toFixed(1));
    document.getElementById('hint').textContent = !timer && !sec ? 'Say what you ordered and what you loved' : sec < 15 ? `Keep going, ${15 - sec} s to go` : 'Looking good. Stop any time';
    const d = document.getElementById('done'); d.style.opacity = sec >= 15 ? 1 : .4; d.firstChild.style.background = sec >= 15 ? 'var(--accent)' : 'rgba(255,255,255,.18)'; };
  // Real camera when the browser allows it; the sample still stays when it does not.
  navigator.mediaDevices?.getUserMedia?.({ video: { facingMode: 'user' }, audio: true }).then(st => {
    const cam = document.getElementById('cam'); cam.srcObject = st; cam.style.display = 'block';
    document.getElementById('prev').style.display = 'none'; document.getElementById('camlbl').style.display = 'none';
    if (window.MediaRecorder) { rec = new MediaRecorder(st); rec.chunks = []; rec.ondataavailable = e => rec.chunks.push(e.data); }
  }).catch(() => {});
  const stop = () => { clearInterval(timer); timer = null; document.getElementById('rb').classList.remove('on'); if (rec && rec.state === 'recording') rec.stop(); };
  document.getElementById('rb').onclick = () => { if (timer) { if (sec >= 15) stop(); return; }
    sec = 0; document.getElementById('rb').classList.add('on'); if (rec) rec.start();
    timer = setInterval(() => { sec++; ui(); if (sec >= 30) stop(); }, 1000); ui(); };
  document.getElementById('cons').onclick = () => { consent = !consent; const b = document.getElementById('cb'); b.classList.toggle('on', consent); b.innerHTML = consent ? icon('check', 14, 3, '#111') : ''; };
  document.getElementById('done').onclick = () => { if (sec < 15) return; stop(); toast(consent ? 'Sent for approval' : 'Saved as private review'); setTimeout(() => go('home'), 900); };
}

/* ---------- ORDER STATUS ---------- */
function status() {
  const st = [['Order received', `${order.placed}`], ['Being prepared', `About ${order.eta} min left`], ['Ready', 'We bring it to your table'], ['Served', 'Enjoy your meal']];
  return `${top(`Order #${order.no}`, `Table ${v.table}`)}<div class="screen"><div class="body">
  <div class="lbl2">Right now</div><h2 class="h2 disp" style="margin-top:2px">Being prepared</h2><p class="lead">About ${order.eta} minutes. We'll show a banner when it's ready, even if you're on another screen.</p>
  <div class="steps" style="margin-top:20px">${st.map(([a, b], i) => `<div class="step ${i < order.step ? 'done' : i === order.step ? 'now' : ''}"><span class="k">${i < order.step ? icon('check', 14, 3) : ''}</span><div><b>${a}</b><span>${b}</span></div></div>`).join('')}</div>
  <div class="box"><div style="font-weight:600;margin-bottom:4px">Your order</div>${order.items.map(o => `<div class="ln"><span>${o.q} × ${it(o.i).n}</span><span>${ced(it(o.i).p * o.q)}</span></div>`).join('')}<div class="tot"><span>Total</span><span>${ced(orderTotal())}.00</span></div></div>
  ${on('play') ? `<button class="vcard" data-go="play"><span class="ic">${icon('game', 24)}</span><span style="flex:1"><b style="display:block">Play while you wait</b><span class="cap">A quick game.${v.game.stampReward ? ` Score ${v.game.stampScore}+ for a loyalty stamp.` : ''}</span></span>${icon('chevron', 18)}</button>` : ''}
  </div></div>
  <div class="bar" style="display:flex;gap:10px"><button class="btn2" data-go="waiter" style="flex:1">${icon('bell', 18)}Call waiter</button>${on('pay') ? `<button class="btn" data-go="pay" style="flex:1">Pay bill</button>` : ''}</div>`;
}

/* ---------- PAY & SPLIT ---------- */
function pay() {
  const total = orderTotal() + 30, people = +(q.get('people') || 3), tip = 0.1, share = total * (1 + tip) / people;
  return `${top('Pay & split bill', `Table ${v.table}`)}<div class="screen"><div class="body">
  <div class="box"><div class="ln"><span>1 × ${it(0).n}</span><span>${ced(it(0).p)}</span></div><div class="ln"><span>2 × ${it(4).n}</span><span>${ced(it(4).p * 2)}</span></div><div class="ln"><span>1 × ${it(3).n}</span><span>${ced(it(3).p)}</span></div><div class="ln"><span>1 × ${it(1).n}</span><span>${ced(it(1).p)}</span></div><div class="tot"><span>Table total</span><span>${ced(total)}.00</span></div></div>
  <div style="font-weight:600;margin:20px 0 10px">How are you paying?</div>
  <div class="seg"><button>Whole bill</button><button class="on">Split equally</button><button>My items</button></div>
  <div class="row" style="justify-content:space-between;margin-top:16px"><span>Number of people</span><span class="stepper"><button>−</button><b style="font-size:18px">${people}</b><button>+</button></span></div>
  <div style="font-weight:600;margin:20px 0 10px">Add a tip for the team</div>
  <div style="display:flex;gap:8px">${['No tip', '5%', '10%', '15%'].map((x, i) => `<span class="chip ${i === 2 ? 'on' : ''}" style="flex:1;justify-content:center;padding:0">${x}</span>`).join('')}</div>
  <div style="font-weight:600;margin:20px 0 2px">Pay with</div>
  ${[['MoMo', 'MTN Mobile Money', '024 ••• 5512', true], ['T', 'Telecel Cash', '', false], ['AT', 'AirtelTigo Money', '', false], [icon('card', 18), 'Debit or credit card', '', false]].map(([a, b, c, s]) => `<button class="pm ${s ? 'on' : ''}"><span class="ic">${a}</span><span><b style="display:block;font-size:15px;line-height:20px">${b}</b>${c ? `<span class="meta">${c}</span>` : ''}</span><span class="rad"></span></button>`).join('')}
  <p class="meta" style="margin-top:12px">Sample bill. Payment providers shown as text only.</p>
  </div></div>
  <div class="bar"><button class="btn split"><span>Pay your share</span><span>${ced(Math.round(share * 100) / 100)}</span></button></div>`;
}

/* ---------- PLAY WHILE YOU WAIT ---------- */
function play() {
  return `${top('Play while you wait', v.name)}<div class="screen" style="padding-bottom:0"><div style="padding:112px 16px 0">${PlateStack.html(v)}</div></div>`;
}
function playMount() { PlateStack.mount(v, vk, { onReadyTap: () => go('status') }); }

/* simple screens for the rest (so every service opens something) */
function simple(id, body) { return `${top(svc(id).t, v.name)}<div class="screen"><div class="body">${body}</div></div>`; }
const OTHER = {
  offers: () => simple('offers', `<h2 class="h2 disp">Today's deals</h2><div class="rw"><span class="ic">${icon('tag', 20)}</span><span class="tx"><b>Jollof Tuesday</b><span>Jollof & chicken + sobolo for GH₵70</span></span></div><div class="rw"><span class="ic">${icon('tag', 20)}</span><span class="tx"><b>Happy hour, 4 to 6 PM</b><span>All drinks 20% off</span></span></div>`),
  reserve: () => simple('reserve', `<h2 class="h2 disp">Book your next visit</h2><p class="lead">Pick a day, time and party size. ${v.name} confirms by SMS.</p>`),
  events: () => simple('events', `<h2 class="h2 disp">What's on</h2><div class="rw"><span class="ic">${icon('party', 20)}</span><span class="tx"><b>Highlife Friday</b><span>Live band from 8 PM</span></span></div><div class="rw"><span class="ic">${icon('help', 20)}</span><span class="tx"><b>Quiz night</b><span>Wednesdays, 7 PM</span></span></div>`),
  feedback: () => simple('feedback', `<h2 class="h2 disp">Tell the manager</h2><p class="lead">This goes to the manager only and is never posted.</p><div class="ta" style="margin-top:16px;color:var(--g500)">What happened?</div>`),
  about: () => simple('about', `<h2 class="h2 disp">${v.name}</h2><p class="lead">${v.about}</p><div class="rw"><span class="ic">${icon('pin', 20)}</span><span class="tx"><b>${v.place}</b><span>Get directions</span></span></div><div class="rw"><span class="ic">${icon('clock', 20)}</span><span class="tx"><b>${v.open}</b><span>${v.until}</span></span></div><div class="rw"><span class="ic">${icon('phone', 20)}</span><span class="tx"><b>Call or WhatsApp</b><span>030 000 0000 (sample)</span></span></div>`),
};

/* ---------- router ---------- */
function render() {
  const r = (location.hash.slice(1) || 'home');
  const [a, b] = r.split('/');
  let html, mount;
  if (a === 'home') { html = home(); mount = homeMount; }
  else if (a === 'story') { html = story(b); mount = () => storyMount(b); }
  else if (a === 'menu') html = menu();
  else if (a === 'wifi') { html = wifi(); mount = wifiMount; }
  else if (a === 'waiter') { html = b === 'sent' ? waiterSent() : waiter(); mount = b === 'sent' ? null : waiterMount; }
  else if (a === 'loyalty') html = loyalty();
  else if (a === 'review') { html = b === 'record' ? reviewRecord() : review(); mount = b === 'record' ? reviewRecordMount : reviewMount; }
  else if (a === 'status') html = status();
  else if (a === 'pay') html = pay();
  else if (a === 'play') { html = play(); mount = playMount; }
  else if (OTHER[a]) html = OTHER[a]();
  else { html = home(); mount = homeMount; }
  PlateStack.unmount?.();
  app.innerHTML = html;
  sb.innerHTML = statusBar(true);
  mount && mount();
}
app.addEventListener('click', e => {
  const tt = e.target.closest('[data-toast]'); if (tt) toast(tt.dataset.toast);
  const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go);
  const g2 = e.target.closest('[data-go2]'); if (g2) setTimeout(() => go(g2.dataset.go2), 900);
});
addEventListener('hashchange', render);
render();

/* ---------- "Your food is ready!" banner, on every screen ---------- */
// Fires when the kitchen marks the order ready. Demo triggers: ?ready=<seconds>, or another tab
// posting to BroadcastChannel('cravins-order') / localStorage 'cravins:order-ready'.
function showReady() {
  const el = document.getElementById('ready');
  el.innerHTML = `<span class="ic">${icon('utensils', 20)}</span><span class="tx"><b>Your food is ready!</b><span>${it(order.items[0].i).n} is on its way to table ${v.table}</span></span><button class="go" id="rgo">View</button>`;
  el.classList.add('show'); window.__ready = true;
  order.step = 2; navigator.vibrate?.(200);
  document.getElementById('rgo').onclick = () => { el.classList.remove('show'); go('status'); };
  setTimeout(() => el.classList.remove('show'), q.get('ready') === '0' ? 1e9 : 8000);
}
window.cravinsShowReady = showReady;
if (q.get('ready') != null) setTimeout(showReady, +q.get('ready') * 1000);
try { new BroadcastChannel('cravins-order').onmessage = m => m.data === 'ready' && showReady(); } catch {}
addEventListener('storage', e => e.key === 'cravins:order-ready' && showReady());
})();
