"""Ozaa scan-frame logo generator.

The mark is a white rounded square (a QR "scan frame") with four corner marks
and a fork and knife cut out of it, sitting on an orange #FC5205 circle.
Cuts are see-through, so the orange (or whatever is behind) shows through.

Three detail tiers keep it clean at every size:
  full   >= 64 px   thin corner marks, slim utensils (the original v5 design)
  small  33-63 px   thicker, shorter corner marks, bolder utensils
  micro  <= 32 px   corner marks dropped (they turn to noise), bigger square, fat utensils
Run:  python3 make_logo.py   (writes svg/ ; PNGs are rendered by render_png.sh)
"""
import os
OR = '#FC5205'; INK = '#111111'; WHITE = '#FFFFFF'
HERE = os.path.dirname(os.path.abspath(__file__))

# Tier settings: utensil stroke widths, utensil scale, corner mark (arm length, width).
TIERS = {
    'full':  dict(t=18, g=9,  h=22, kw=40, sc=0.78, arm=34, w=15, sq=(112, 288, 72)),
    'small': dict(t=24, g=10, h=28, kw=46, sc=0.84, arm=30, w=24, sq=(112, 288, 72)),
    'micro': dict(t=28, g=11, h=34, kw=50, sc=1.02, arm=0,  w=0,  sq=(88, 336, 84)),
}

def utensils(p):
    """Fork (3 tines + neck + handle) and knife, drawn in a 0..512 box around (252,261)."""
    t, g, h, kw = p['t'], p['g'], p['h'], p['kw']
    x0 = 210 - (3 * t + 2 * g) / 2; w = 3 * t + 2 * g
    s = ''.join(f'<rect x="{x0+i*(t+g)}" y="166" width="{t}" height="80" rx="{t/2}"/>' for i in range(3))
    s += (f'<path d="M{x0} 228 H{x0+w} V244 C{x0+w} 264 {x0+w-16} 274 210 274 '
          f'C{x0+16} 274 {x0} 264 {x0} 244 Z"/>'
          f'<rect x="{210-h/2}" y="250" width="{h}" height="108" rx="{h/2}"/>'
          f'<path d="M286 164 C {286+kw} 172 {300+kw} 226 {290+kw-8} 276 H 286 Z"/>'
          f'<rect x="286" y="262" width="{h+2}" height="96" rx="{(h+2)/2}"/>')
    return f'<g transform="translate(256 258) scale({p["sc"]}) translate(-252 -261)">{s}</g>'

def corners(p):
    """Four L-shaped QR corner marks. The micro tier has none."""
    if p['arm'] == 0:
        return ''
    L, w = p['arm'], p['w']; out = ''
    for x, y, dx, dy in [(150, 150, 1, 1), (362, 150, -1, 1), (150, 362, 1, -1), (362, 362, -1, -1)]:
        out += (f'<path d="M{x} {y+dy*L} V{y} H{x+dx*L}" fill="none" stroke="#000" '
                f'stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')
    return out

def mark_mask(tier, uid):
    p = TIERS[tier]
    return (f'<mask id="{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">'
            f'<rect x="{p["sq"][0]}" y="{p["sq"][0]}" width="{p["sq"][1]}" height="{p["sq"][1]}" rx="{p["sq"][2]}" fill="#fff"/>'
            f'<g fill="#000">{utensils(p)}{corners(p)}</g></mask>')

def svg(body, defs='', size=512):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
            f'<defs>{defs}</defs>{body}</svg>')

def icon(tier='full', bg=OR, fg=WHITE, shape='circle'):
    """Logo on a coloured background. shape: circle (logo), square (iOS/store icon), none."""
    back = {'circle': f'<circle cx="256" cy="256" r="256" fill="{bg}"/>',
            'square': f'<rect width="512" height="512" fill="{bg}"/>', 'none': ''}[shape]
    return svg(back + f'<rect width="512" height="512" fill="{fg}" mask="url(#m)"/>', mark_mask(tier, 'm'))

def adaptive_fg(tier='full', fg=WHITE):
    """Android adaptive foreground: mark only, shrunk to the 66% safe zone (transparent bg).
    The white square is 288/512 = 56% wide, and we scale it by 0.86 so it sits well inside."""
    inner = f'<g transform="translate(256 256) scale(0.86) translate(-256 -256)"><rect width="512" height="512" fill="{fg}" mask="url(#m)"/></g>'
    return svg(inner, mark_mask(tier, 'm'))

def write(name, text):
    with open(os.path.join(HERE, 'svg', name), 'w') as f: f.write(text)

if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'svg'), exist_ok=True)
    for tier in TIERS:
        sfx = '' if tier == 'full' else f'-{tier}'
        write(f'ozaa-icon{sfx}.svg', icon(tier))                              # orange circle, white mark
        write(f'ozaa-icon-black{sfx}.svg', icon(tier, bg=INK))                # mono dark
        write(f'ozaa-icon-white{sfx}.svg', icon(tier, bg=WHITE, fg=OR))       # for dark/orange backgrounds
        write(f'ozaa-mark-mono{sfx}.svg', icon(tier, fg=INK, shape='none'))    # single colour glyph, no circle
    write('ozaa-app-icon-square.svg', icon('full', shape='square'))            # iOS + store (OS rounds corners)
    write('ozaa-adaptive-foreground.svg', adaptive_fg('full'))
    write('ozaa-adaptive-monochrome.svg', adaptive_fg('full', fg='#000000'))   # Android 13 themed icon
    write('ozaa-adaptive-background.svg', svg(f'<rect width="512" height="512" fill="{OR}"/>'))
    print('svg written')

# ---- Lockups: icon + "ozaa" wordmark (Unbounded 700 outlined to a path) ----
def lockups():
    import json
    wm = json.load(open(os.path.join(HERE, 'wordmark_path.json'))); W = round(wm['w'] + 190)
    def inner(s, x, y, size):
        return s.replace('viewBox="0 0 512 512" width="512" height="512"', f'x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 512 512"', 1)
    for name, ic, ink in [('ozaa-lockup', icon('full'), INK), ('ozaa-lockup-mono', icon('full', bg=INK), INK),
                          ('ozaa-lockup-on-dark', icon('full'), WHITE)]:
        write(f'{name}.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} 140" width="{W}" height="140">'
              f'{inner(ic, 10, 10, 120)}<g transform="translate(152,98)"><path d="{wm["d"]}" fill="{ink}"/></g></svg>')

if __name__ == '__main__':
    lockups(); print('lockups written')
