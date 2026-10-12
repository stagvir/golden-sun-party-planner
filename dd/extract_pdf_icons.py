"""Extract Dark Dawn icons from the Golden Sun Realm guide PDFs (goldensunrealm.com/gsdd/, printed to PDF).

Each icon is an embedded image (RGB + alpha mask) on the same row as its bold name, to its right.
Items go to ../icons/dd/<Key>_DD.png (the key build.py's icon_key gives), Psynergy to ../ui/psynergy_dd/<Key>.png.
The icons keep DD's menu frame, and the Psynergy icons keep their PP cost, as printed in the guides.
Needs PyMuPDF and Pillow.
Usage: python3 extract_pdf_icons.py <weapon.pdf> <armor.pdf> <blacksmith.pdf> <psynergy.pdf>
"""
import io, os, re, sys
import pymupdf
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
key = lambda n: re.sub(r'[^A-Za-z0-9]+', '_', re.sub(r"['’.]", '', n)).strip('_')

def icons(path):
    doc = pymupdf.open(path)
    for pg in doc:
        spans = [s for b in pg.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans'] if 'Bold' in s['font'] and s['text'].strip()]
        for im in pg.get_image_info(xrefs=True):
            if not (28 <= im['width'] <= 60 and 28 <= im['height'] <= 60): continue
            x0, y0, x1, y1 = im['bbox']
            near = [s for s in spans if 0 <= s['bbox'][0] - x1 + 2 < 42 and y0 - 6 <= (s['bbox'][1] + s['bbox'][3]) / 2 <= y1 + 6]
            if not near: continue
            pix = pymupdf.Pixmap(doc, im['xref'])
            smask = doc.extract_image(im['xref']).get('smask')
            if smask: pix = pymupdf.Pixmap(pix, pymupdf.Pixmap(doc, smask))
            yield min(near, key=lambda s: s['bbox'][0])['text'].strip(), Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGBA')

def save(img, path):
    # Lossless palette PNG when the sprite has 256 colours or fewer (they all do), else plain RGBA
    cols = img.getcolors(256)
    if cols:
        pal = Image.new('P', img.size); idx = {c: i for i, (_, c) in enumerate(cols)}
        pal.putdata([idx[c] for c in img.get_flattened_data()])
        pal.putpalette([v for _, c in cols for v in c[:3]])
        pal.info['transparency'] = bytes(c[3] for _, c in cols)
        pal.save(path, optimize=True, transparency=pal.info['transparency'])
    else:
        img.save(path, optimize=True)

weapon, armor, smith, psy = sys.argv[1:5]
item_dir = os.path.join(here, '..', 'icons', 'dd'); psy_dir = os.path.join(here, '..', 'ui', 'psynergy_dd')
os.makedirs(item_dir, exist_ok=True); os.makedirs(psy_dir, exist_ok=True)
done = set()
for path in (weapon, armor, smith):  # the blacksmith guide repeats forged items; the first copy wins
    for name, img in icons(path):
        k = key(name)
        if k not in done: save(img, os.path.join(item_dir, k + '_DD.png')); done.add(k)
n = 0
for name, img in icons(psy):
    save(img, os.path.join(psy_dir, key(name) + '.png')); n += 1
print(len(done), 'item icons,', n, 'Psynergy icons')
