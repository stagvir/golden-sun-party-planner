"""Name the sprites on the two unlabelled Dark Dawn icon sheets, using the Golden Sun Realm guide PDFs.

icon_sheets/dd_item_icons.png and dd_psynergy_icons.png hold native 24x24 sprites with no names. The guide
PDFs (goldensunrealm.com/gsdd/ weapons, armor, blacksmith, psynergy pages printed to PDF) show the same
sprites inside DD's menu frame (and, for Psynergy, with the PP cost on top), next to each name.
Each sheet sprite is slid over every named PDF icon and scored by the share of its visible pixels that match.
Names are then handed out one-to-one, best score first, so tiers drawn from the same base art (Ply, Ply Well,
Pure Ply) each get their own sprite. A match needs 80% (exact item matches score 100%; Psynergy loses a little
to the PP digits) and must beat the sprite's next-best other name by 5 points.

Writes items to ../icons/dd/<Key>_DD.png and Psynergy to ../ui/psynergy_dd/<Key>.png (transparent background),
and a report to name_icon_sheets.json. Needs PyMuPDF, Pillow and numpy.
Usage: python3 name_icon_sheets.py <weapon.pdf> <armor.pdf> <blacksmith.pdf> <psynergy.pdf>
"""
import io, json, os, re, sys
import numpy as np
import pymupdf
from PIL import Image
from numpy.lib.stride_tricks import sliding_window_view

here = os.path.dirname(os.path.abspath(__file__))
key = lambda n: re.sub(r'[^A-Za-z0-9]+', '_', re.sub(r"['’.]", '', n)).strip('_')
MIN_SCORE, MIN_MARGIN = 0.8, 0.05

def pdf_icons(path):
    """(name, RGB array) for every framed icon with a bold name to its right, in page order."""
    doc = pymupdf.open(path)
    for pg in doc:
        spans = [s for b in pg.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans'] if 'Bold' in s['font'] and s['text'].strip()]
        for im in pg.get_image_info(xrefs=True):
            if not (28 <= im['width'] <= 60 and 28 <= im['height'] <= 60): continue
            x0, y0, x1, y1 = im['bbox']
            near = [s for s in spans if 0 <= s['bbox'][0] - x1 + 2 < 42 and y0 - 6 <= (s['bbox'][1] + s['bbox'][3]) / 2 <= y1 + 6]
            if near:
                rgb = Image.open(io.BytesIO(pymupdf.Pixmap(doc, im['xref']).tobytes('png'))).convert('RGB')
                yield min(near, key=lambda s: s['bbox'][0])['text'].strip(), np.asarray(rgb).astype(np.int16)

def sheet_cells(path):
    """24x24 cells separated by white lines, inside a 1px black border."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)[1:-1, 1:-1]
    ink = ~np.all(a == 255, -1)
    def runs(v):
        out, start = [], None
        for i, x in enumerate(list(v) + [False]):
            if x and start is None: start = i
            if not x and start is not None: out.append((start, i)); start = None
        return out
    for y0, y1 in runs(ink.any(1)):
        for x0, x1 in runs(ink[y0:y1].any(0)):
            yield a[y0:y1, x0:x1]

def alpha(cell, kind):
    if kind == 'item':  # pure magenta or green chroma key, whichever the cell uses
        mag, grn = np.all(cell == [255, 0, 255], -1), np.all(cell == [0, 255, 0], -1)
        return ~(mag if mag.sum() >= grn.sum() else grn)
    # pure black is the Psynergy sheet's background, including pockets enclosed by the art (the PDFs show
    # the menu's blue there), so all of it goes transparent
    return ~np.all(cell == 0, -1)

def score(cell, mask, ref):
    win = sliding_window_view(ref, (24, 24, 3))[:, :, 0]  # every 24x24 placement inside the framed icon
    ok = (np.abs(win - cell).sum(-1) <= 24) & mask
    return ok.sum((-1, -2)).max() / max(mask.sum(), 1)

def save(cell, mask, path):
    rgba = np.dstack([cell, np.where(mask, 255, 0)]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA'); cols = img.getcolors(256)
    pal = Image.new('P', img.size); idx = {c: i for i, (_, c) in enumerate(cols)}
    pal.putdata([idx[c] for c in img.get_flattened_data()]); pal.putpalette([v for _, c in cols for v in c[:3]])
    pal.save(path, optimize=True, transparency=bytes(c[3] for _, c in cols))

def run(sheet, kind, refs, out_dir, suffix):
    os.makedirs(out_dir, exist_ok=True)
    cells = [(c, alpha(c, kind)) for c in sheet_cells(sheet)]
    S = np.array([[score(c, m, ref) for _, ref in refs] for c, m in cells])  # cells x PDF icons
    names = [n for n, _ in refs]
    def by_name(i):  # this cell's best score per name, best first
        b = {}
        for j, n in enumerate(names):
            if S[i, j] > b.get(n, (0,))[0]: b[n] = (S[i, j], j)
        return sorted(b.items(), key=lambda kv: -kv[1][0])
    ranked = [by_name(i) for i in range(len(cells))]
    taken, out = {}, {}  # name -> [PDF icon index per sprite], cell -> (name, score, runner-up)
    pairs = sorted(((sc, i, n, j) for i, r in enumerate(ranked) for n, (sc, j) in r), reverse=True)
    for sc, i, n, j in pairs:
        if sc < MIN_SCORE or i in out: continue
        others = [x[1][0] for x in ranked[i] if x[0] != n]
        if others and sc - others[0] < MIN_MARGIN: continue
        if n in taken:
            # a second sprite for a name only when it is a different PDF icon the first sprite doesn't match
            # (DD has two Rusty Swords); otherwise it's a repeat of the same item
            first = taken[n][0]
            if sc < 0.99 or any(S[i2, j] >= 0.99 for i2, (n2, _, _) in out.items() if n2 == n): continue
        taken.setdefault(n, []).append(j); out[i] = (n, sc, others[0] if others else 0)
    report = []
    for i, (c, m) in enumerate(cells):
        if i not in out:
            report.append({'cell': i, 'name': None, 'best': ranked[i][0][0], 'score': round(ranked[i][0][1][0], 3)}); continue
        n, sc, second = out[i]
        k = key(n); nth = sum(1 for i2 in out if i2 < i and out[i2][0] == n)
        k = k if nth == 0 else f'{k}_{nth + 1}'
        save(c, m, os.path.join(out_dir, k + suffix + '.png'))
        report.append({'cell': i, 'name': n, 'file': k + suffix + '.png', 'score': round(sc, 3), 'runner_up': round(second, 3)})
    return report

weapon, armor, smith, psy = sys.argv[1:5]
items = [r for p in (weapon, armor, smith) for r in pdf_icons(p)]
rep = {'items': run(os.path.join(here, 'icon_sheets', 'dd_item_icons.png'), 'item', items, os.path.join(here, '..', 'icons', 'dd'), '_DD'),
       'psynergy': run(os.path.join(here, 'icon_sheets', 'dd_psynergy_icons.png'), 'psy', list(pdf_icons(psy)), os.path.join(here, '..', 'ui', 'psynergy_dd'), '')}
json.dump(rep, open(os.path.join(here, 'name_icon_sheets.json'), 'w'), indent=1)
for k, r in rep.items(): print(k, len(r), 'sprites,', sum(1 for x in r if x['name']), 'named')
