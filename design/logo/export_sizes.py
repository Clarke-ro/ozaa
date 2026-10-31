"""Make the sized PNGs (and favicon.ico) from the 1024 px renders, picking the detail tier per size."""
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); BIG = os.path.join(HERE, 'png', '_1024')
def tier(size): return '' if size >= 64 else ('-small' if size > 32 else '-micro')
def out(src, size, dst):
    im = Image.open(os.path.join(BIG, src + '.png')).convert('RGBA').resize((size, size), Image.LANCZOS)
    im.save(os.path.join(HERE, dst)); return im
P = 'png'; X = 'expo'
for s in [1024, 512, 192, 180, 128, 96, 64, 48, 32, 24, 16]:
    out('ozaa-icon' + tier(s), s, f'{P}/ozaa-icon-{s}.png')
for s in [512, 48, 24]:
    out('ozaa-icon-black' + tier(s), s, f'{P}/ozaa-icon-black-{s}.png')
    out('ozaa-icon-white' + tier(s), s, f'{P}/ozaa-icon-white-{s}.png')
    out('ozaa-mark-mono' + tier(s), s, f'{P}/ozaa-mark-mono-{s}.png')
# Expo app.json assets
sq = out('ozaa-app-icon-square', 1024, f'{X}/icon.png')                     # iOS: no transparency allowed
Image.alpha_composite(Image.new('RGBA', sq.size, '#FC5205'), sq).convert('RGB').save(f'{HERE}/{X}/icon.png')
out('ozaa-adaptive-foreground', 1024, f'{X}/adaptive-icon-foreground.png')
out('ozaa-adaptive-background', 1024, f'{X}/adaptive-icon-background.png')
out('ozaa-adaptive-monochrome', 1024, f'{X}/adaptive-icon-monochrome.png')
out('ozaa-icon', 1024, f'{X}/splash-icon.png')                               # shown on white splash
out('ozaa-icon-micro', 48, f'{X}/favicon.png')
ico = [Image.open(os.path.join(BIG, 'ozaa-icon' + tier(s) + '.png')).convert('RGBA').resize((s, s), Image.LANCZOS) for s in (16, 32, 48)]
ico[2].save(f'{HERE}/{X}/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])
print('png written')
