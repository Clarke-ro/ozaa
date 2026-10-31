#!/bin/bash
# Renders every svg/*.svg to a 1024 px transparent PNG with headless Chrome,
# then export_sizes.py makes the smaller sizes from the right detail tier.
cd "$(dirname "$0")"; mkdir -p png/_1024
for f in $(ls svg/*.svg | grep -v lockup); do
  n=$(basename "$f" .svg)
  echo "<html><body style='margin:0;background:transparent'><img src='../../$f' width=1024 height=1024 style='display:block'></body></html>" > png/_1024/_page.html
  google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size=1024,1024 --screenshot="$PWD/png/_1024/$n.png" "file://$PWD/png/_1024/_page.html" >/dev/null 2>&1
done
# Lockups are wide: render at 4x their viewBox (140 px tall -> 560 px).
for f in svg/*lockup*.svg; do
  n=$(basename "$f" .svg); w=$(grep -o 'viewBox="0 0 [0-9]*' "$f" | grep -o '[0-9]*$' | head -1); W=$((w*4))
  echo "<html><body style='margin:0;background:transparent'><img src='../../$f' width=$W height=560 style='display:block'></body></html>" > png/_1024/_page.html
  google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size=$W,560 --screenshot="$PWD/png/$n.png" "file://$PWD/png/_1024/_page.html" >/dev/null 2>&1
done
rm png/_1024/_page.html
python3 export_sizes.py
