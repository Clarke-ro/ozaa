"""Builds preview.png: every size at real pixels and zoomed 4x, on light and dark rows."""
from PIL import Image, ImageDraw
import os
H = os.path.dirname(os.path.abspath(__file__))
def load(p): return Image.open(os.path.join(H, p)).convert('RGBA')
W, ROWH = 1700, 300
board = Image.new('RGBA', (W, ROWH * 3 + 40), 'white'); d = ImageDraw.Draw(board)
for r, bg in enumerate(['#FFFFFF', '#111111']):
    y = 20 + r * ROWH; d.rectangle([0, y - 20, W, y + ROWH - 20], fill=bg); x = 20
    board.alpha_composite(load('png/cravins-icon-192.png').resize((240, 240)), (x, y)); x += 270
    for s in (96, 48, 32, 24, 16):
        im = load(f'png/cravins-icon-{s}.png'); board.alpha_composite(im, (x, y)); x += s + 20
        z = im.resize((s * 4 if s <= 48 else s * 2,) * 2, Image.NEAREST); board.alpha_composite(z, (x, y)); x += z.width + 40
y = 20 + 2 * ROWH; x = 20
for p in ['png/cravins-icon-black-512.png', 'png/cravins-icon-white-512.png', 'png/cravins-mark-mono-512.png', 'expo/icon.png']:
    bgc = '#FC5205' if 'white' in p else '#F4F4F5'
    d.rectangle([x, y, x + 240, y + 240], fill=bgc); board.alpha_composite(load(p).resize((240, 240)), (x, y)); x += 270
fg = load('expo/adaptive-icon-foreground.png'); bgi = load('expo/adaptive-icon-background.png')
ad = Image.alpha_composite(bgi, fg).resize((240, 240)); m = Image.new('L', (240, 240), 0); ImageDraw.Draw(m).ellipse([0, 0, 239, 239], fill=255)
board.paste(ad, (x, y), m); x += 270
mono = load('expo/adaptive-icon-monochrome.png').resize((240, 240)); d.ellipse([x, y, x + 240, y + 240], fill='#DCE3F7'); board.alpha_composite(mono, (x, y))
d.text((20, y + 260), 'Row 1-2: 192 (shown 240), 96, 48 (small tier), 32/24/16 (micro tier), each real size then zoomed. '
       'Row 3: mono black, white-on-orange, single-colour glyph, iOS icon 1024, Android adaptive (circle mask), Android 13 themed mono.', fill='#111111')
board.convert('RGB').save(os.path.join(H, 'preview.png')); print('preview.png')
