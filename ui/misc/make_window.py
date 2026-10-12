"""Draw the GBA Golden Sun window frame (default blue palette) as 15x15 9-slice PNGs for CSS border-image.

Colours are sampled from an in-game screenshot (name entry screen, default window colour):
  frame, outside to inside on the top/left sides: #525252, #ffffff, #a5a5a5, #000000 (reversed on bottom/right)
  inner bevel, top/left: #005252, #005a63, #00636b; bottom/right (outside in): #088cbd, #087bad, #08739c
  fill: #006b8c
The 'sel' variant is the same frame around a lighter fill, used for the cursor/selected state (not sampled).
Writes window.png and window_sel.png next to this script.
"""
import os
from PIL import Image

FRAME_TL = ['#525252', '#ffffff', '#a5a5a5', '#000000']
FRAME_BR = ['#000000', '#a5a5a5', '#ffffff', '#525252']
STYLES = {
    'window': {'tl': ['#005252', '#005a63', '#00636b'], 'br': ['#088cbd', '#087bad', '#08739c'], 'fill': '#006b8c'},
    'window_sel': {'tl': ['#0a6f96', '#0c7ba5', '#0e86b2'], 'br': ['#5cc8f0', '#48b8e6', '#36a8da'], 'fill': '#1f98c8'},
}
N = 15
here = os.path.dirname(os.path.abspath(__file__))
for name, st in STYLES.items():
    im = Image.new('RGBA', (N, N))
    for y in range(N):
        for x in range(N):
            dt, dl, db, dr = y, x, N - 1 - y, N - 1 - x
            m = min(dt, dl, db, dr)
            tl = min(dt, dl) <= min(db, dr)
            if (dt == 0 or db == 0) and (dl == 0 or dr == 0): c = '#00000000'  # rounded corner
            elif m < 4: c = (FRAME_TL if tl else FRAME_BR)[m]
            elif m < 7: c = (st['tl'] if tl else st['br'])[m - 4]
            else: c = st['fill']
            im.putpixel((x, y), Image.new('RGBA', (1, 1), c).getpixel((0, 0)))
    im.save(os.path.join(here, name + '.png'))
    print(name)
