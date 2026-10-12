"""Build gsfont.woff2, Golden Sun's menu font, from the glyph sprites in glyphs/ and the name-entry grid gstext.gif.

Each glyph GIF is tight-cropped (white pixels plus the black 1px diagonal shadow), so it has no baseline. Its
position in gstext.gif (8x8 cells, three blocks of five columns from x=8, rows from y=8) gives the baseline:
capitals sit on the bottom of the cell's 7th row. Only white pixels become outlines; the page draws the shadow
with text-shadow. One glyph pixel = 100 font units and the em is 10 pixels, so font sizes that are multiples of
10px render every glyph pixel as a whole number of screen pixels.
Needs Pillow, fontTools and brotli. Usage: python3 build_font.py
"""
import os
from PIL import Image
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

here = os.path.dirname(os.path.abspath(__file__))
U = 100                       # font units per glyph pixel
WHITE = (248, 248, 248)
GRID = ['ABCDEFGHIJKLMNO', 'PQRSTUVWXYZ!?()', 'abcdefghijklmno', 'pqrstuvwxyz.@/:', '0123456789-_~#|', ",';\"&$%^+=<>[]"]
FILE = {'!': 'exclaimationpoint', '?': 'questionmark', '(': 'parentheses1', ')': 'parentheses2', '.': 'period', '@': 'at',
        '/': 'slash', ':': 'colin', '-': 'dash', '_': 'underline', '~': 'tilde', '#': 'number', '|': 'line', ',': 'comma',
        "'": 'apostrophe', ';': 'semicolin', '"': 'quote', '&': 'and', '$': 'dollar', '%': 'percent', '^': 'arrow', '+': 'plus',
        '=': 'equals', '<': 'arrow-left', '>': 'arrow-right', '[': 'bracket-left', ']': 'bracket-right'}

def fname(ch):
    if ch in FILE: return FILE[ch]
    return 'lowercase-' + ch if ch.islower() else ch

def white_mask(img):
    px = img.convert('RGBA').load(); w, h = img.size
    return {(x, y) for y in range(h) for x in range(w) if px[x, y][:3] == WHITE and px[x, y][3]}

grid = Image.open(os.path.join(here, 'gstext.gif')).convert('RGBA')
gw = white_mask(grid)
glyphs = {}
for r, row in enumerate(GRID):
    for c, ch in enumerate(row):
        cx, cy = 8 + 8 * c + 8 * (c // 5), 8 + 8 * r
        g = Image.open(os.path.join(here, 'glyphs', fname(ch) + '.gif'))
        m = white_mask(g)
        mx, my = min(x for x, _ in m), min(y for _, y in m)
        shape = {(x - mx, y - my) for x, y in m}
        # where does this shape sit in its own cell? Exact match, fully inside the cell (8 wide; 10 tall so
        # descenders fit). Tiny glyphs like '.' would also match parts of neighbours, hence the bounds.
        sw, sh = max(x for x, _ in shape) + 1, max(y for _, y in shape) + 1
        hits = [(dx, dy) for dy in range(0, 11 - sh) for dx in range(0, 9 - sw)
                if all((cx + dx + x, cy + dy + y) in gw for x, y in shape)]
        if len(hits) != 1: raise SystemExit(f'{ch!r}: {len(hits)} matches in its cell {hits}')
        dx, dy = hits[0]
        top = dy                                  # rows below the cell top
        w = max(x for x, _ in shape) + 1
        glyphs[ch] = (shape, top, w)

# Characters the page uses that the game's grid lacks, drawn for this page in the same style (not game art).
# Rows top to bottom from the cell top ('#' = white pixel).
EXTRA = {
    '\u00b7': (3, ['##', '##']),                          # middle dot
    '\u2013': (3, ['#####']),                             # en dash
    '\u2014': (3, ['#######']),                           # em dash
    '\u2212': (3, ['#####']),                             # minus
    '\u2192': (1, ['...#.', '....#', '#####', '....#', '...#.']),   # right arrow
    '\u00d7': (2, ['#...#', '.#.#.', '..#..', '.#.#.', '#...#']),   # multiplication sign
    '\u21c4': (0, ['....#..', '.....#.', '#######', '.....#.', '..#.#..', '.#.....', '#######', '.#.....', '..#....']),  # swap arrows (→ over ←)
}
for ch, (top, rows) in EXTRA.items():
    shape = {(x, y) for y, row in enumerate(rows) for x, c in enumerate(row) if c == '#'}
    glyphs[ch] = (shape, top, max(len(r) for r in rows))

BASE = 7                                          # capitals fill cell rows 0-6; the baseline is under row 6
fb = FontBuilder(10 * U, isTTF=True)
order = ['.notdef', 'space'] + [f'g{ord(ch):04x}' for ch in glyphs]
fb.setupGlyphOrder(order)
fb.setupCharacterMap({32: 'space', **{ord(ch): f'g{ord(ch):04x}' for ch in glyphs}})
outlines, metrics = {}, {}
def draw(shape, top):
    pen = TTGlyphPen(None)
    for x, y in sorted(shape):
        y0 = (BASE - (top + y) - 1) * U          # pixel rows below the baseline go negative
        pen.moveTo((x * U, y0)); pen.lineTo((x * U, y0 + U)); pen.lineTo((x * U + U, y0 + U)); pen.lineTo((x * U + U, y0)); pen.closePath()
    return pen.glyph()
outlines['.notdef'] = TTGlyphPen(None).glyph(); metrics['.notdef'] = (6 * U, 0)
outlines['space'] = TTGlyphPen(None).glyph(); metrics['space'] = (4 * U, 0)
for ch, (shape, top, w) in glyphs.items():
    n = f'g{ord(ch):04x}'
    outlines[n] = draw(shape, top)
    metrics[n] = ((w + 1) * U, 0)                 # glyph + its shadow column (the shadow is the gap)
fb.setupGlyf(outlines)
fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=9 * U, descent=-3 * U)
fb.setupNameTable({'familyName': 'GS Menu', 'styleName': 'Regular'})
fb.setupOS2(sTypoAscender=9 * U, sTypoDescender=-3 * U, sTypoLineGap=0, usWinAscent=9 * U, usWinDescent=3 * U, sxHeight=5 * U, sCapHeight=7 * U)
fb.setupPost()
fb.font.flavor = 'woff2'
out = os.path.join(here, 'gsfont.woff2')
fb.save(out)
print(len(glyphs), 'glyphs ->', out, os.path.getsize(out), 'bytes')
