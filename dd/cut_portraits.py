"""Cut the Dark Dawn mugshots out of icon_sheets/dd_mugshots.png into ../ui/portraits/<Name>_DD.gif.

The sheet is one column of 32x32 portraits at x=3, y=3+34*row, with white outside each portrait's
rounded border. White connected to a tile's edge becomes transparent.
Usage: python3 cut_portraits.py [sheet] [out_dir]
"""
import os, sys
from PIL import Image

ORDER = ['Matthew', 'Karis', 'Tyrell', 'Rief', 'Amiti', 'Sveta', 'Eoleo', 'Himi']
here = os.path.dirname(os.path.abspath(__file__))
sheet = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'icon_sheets', 'dd_mugshots.png')
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, '..', 'ui', 'portraits')
im = Image.open(sheet).convert('RGBA')
for row, name in enumerate(ORDER):
    y = 3 + 34 * row
    t = im.crop((3, y, 35, y + 32))
    px = t.load()
    todo = [(x, y) for x in range(32) for y in (0, 31)] + [(x, y) for x in (0, 31) for y in range(32)]
    seen = set()
    while todo:
        p = todo.pop()
        if p in seen or not (0 <= p[0] < 32 and 0 <= p[1] < 32) or px[p][:3] != (255, 255, 255):
            continue
        seen.add(p); px[p] = (0, 0, 0, 0)
        todo += [(p[0] + 1, p[1]), (p[0] - 1, p[1]), (p[0], p[1] + 1), (p[0], p[1] - 1)]
    # GIF needs a palette with one transparent index
    pal = t.convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    alpha = t.getchannel('A')
    pal.putpalette(pal.getpalette()[:255 * 3] + [0, 0, 0])
    pal.paste(255, mask=alpha.point(lambda a: 255 if a == 0 else 0))
    pal.save(os.path.join(out, name + '_DD.gif'), transparency=255)
    print(name, len(seen), 'transparent px')
