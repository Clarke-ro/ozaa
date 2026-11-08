// Cravins venue theming: derive safe colours from one brand colour (WCAG 2.1).
(function (g) {
  const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const rgb2hex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  const lum = h => { const c = hex2rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };
  // darken toward black in small steps until the colour reaches `min` against `bg`
  const darkenUntil = (c, bg, min) => { let x = c, t = 0; while (contrast(x, bg) < min && t < 1) { t += 0.02; x = mix(c, '#000000', t); } return x; };
  const BLACK = '#111111', WHITE = '#FFFFFF';
  // Cravins's own orange. Bright #FC5205 is for the logo and large surfaces; #D24000 carries white text.
  const CRAVINS = { brand: '#FC5205', primary: '#D24000', hover: '#BA3800', pressed: '#A33000', tint: '#FFF1EA' };
  const DEFAULT_ACCENT = CRAVINS.primary;
  // CIE76 colour distance, used to flag venue colours that would blur into Cravins orange
  const lab = h => { const c = hex2rgb(h).map(v => { v /= 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; });
    const X = (0.4124 * c[0] + 0.3576 * c[1] + 0.1805 * c[2]) / 0.95047, Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], Z = (0.0193 * c[0] + 0.1192 * c[1] + 0.9505 * c[2]) / 1.08883;
    const f = v => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116; return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]; };
  const distance = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
  function deriveTheme(accent) {
    // No venue colour yet: use Cravins's tuned orange set, not the generic derivation.
    if (!accent) return { accent: DEFAULT_ACCENT, fill: CRAVINS.primary, onAccent: WHITE, pressed: CRAVINS.pressed, ink: CRAVINS.primary, tint: CRAVINS.tint, badgeInk: CRAVINS.hover, isDefault: true, notes: [],
      ratios: { buttonText: +contrast(WHITE, CRAVINS.primary).toFixed(2), inkOnWhite: +contrast(CRAVINS.primary, WHITE).toFixed(2), badge: +contrast(CRAVINS.hover, CRAVINS.tint).toFixed(2), whiteOnAccent: +contrast(WHITE, CRAVINS.primary).toFixed(2) }, cravinsDistance: 0 };
    accent = accent.toUpperCase();
    const onWhite = contrast(WHITE, accent), onBlack = contrast(BLACK, accent);
    const notes = [];
    // 1. Text on the brand colour (buttons, active chips): white if AA, else near-black.
    let onAccent = WHITE, fill = accent;
    if (onWhite < 4.5) {
      if (onBlack >= 4.5) { onAccent = BLACK; notes.push(`White text on ${accent} is ${onWhite.toFixed(2)}:1, so buttons use dark text (${onBlack.toFixed(2)}:1).`); }
      else { fill = darkenUntil(accent, WHITE, 4.5); notes.push(`Neither white nor dark text passes on ${accent}, so buttons use the darker ${fill}.`); }
    }
    // 2. The brand colour as icons or text on white needs 4.5 (we hold icons to text level for simplicity).
    const ink = contrast(accent, WHITE) >= 4.5 ? accent : darkenUntil(accent, WHITE, 4.5);
    if (ink !== accent) notes.push(`${accent} on white is ${contrast(accent, WHITE).toFixed(2)}:1, so icons and links use ${ink} (${contrast(ink, WHITE).toFixed(2)}:1).`);
    // 3. Tint for badges and icon circles, with text on it held to 4.5.
    const tint = mix(accent, WHITE, 0.86);
    const badgeInk = darkenUntil(ink, tint, 4.5);
    const pressed = onAccent === WHITE ? mix(fill, '#000000', 0.14) : mix(fill, '#000000', 0.08);
    // 4. Keep venue colours apart from Cravins orange (Cravins chrome sits next to the venue's colour on Customise).
    const cravinsDistance = Math.min(distance(accent, CRAVINS.primary), distance(accent, CRAVINS.brand));
    if (cravinsDistance < 20) notes.push(`${accent} is very close to Cravins orange, so guests may not tell your buttons from ours. A deeper or different colour will stand out more.`);
    return { accent, fill, onAccent, pressed, ink, tint, badgeInk, notes, cravinsDistance: +cravinsDistance.toFixed(1),
      ratios: { buttonText: +contrast(onAccent, fill).toFixed(2), inkOnWhite: +contrast(ink, WHITE).toFixed(2), badge: +contrast(badgeInk, tint).toFixed(2), whiteOnAccent: +onWhite.toFixed(2) } };
  }
  function applyTheme(t, el) { const s = (el || document.documentElement).style;
    s.setProperty('--accent', t.fill); s.setProperty('--on-accent', t.onAccent); s.setProperty('--accent-pressed', t.pressed);
    s.setProperty('--accent-ink', t.ink); s.setProperty('--accent-tint', t.tint); s.setProperty('--badge-ink', t.badgeInk); }
  g.CravinsTheme = { contrast, mix, distance, deriveTheme, applyTheme, CRAVINS, DEFAULT_ACCENT };
  if (typeof module !== 'undefined') module.exports = g.CravinsTheme;
})(typeof window !== 'undefined' ? window : globalThis);
