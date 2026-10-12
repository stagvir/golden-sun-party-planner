"""Parse the Golden Sun Realm Dark Dawn weapon and armor guides (goldensunrealm.com/gsdd/weapons.php and
armors.php, printed to PDF) into dditems.json.

Each item is laid out as: framed icon + bold name, price at the right; "Attack +N" / "Defense +N"; the type line
("Weapon: Long Sword (Cursed)", "Body: Robe (Use to reduce enemy Attack)"); where to find it. The right-hand column
holds the weapon's unleashes, or the armor's effects, with a small element ball in front of Power/Resist lines.

Output items use the GBA data's fields where they mean the same thing (n, sl, k, a, d, c, e, us) plus DD-only ones:
  ul    unleash names, in the order the guide lists them (DD weapons have several; no rates or power are given)
  note  the type line's description, e.g. "Boosts Earth Power" (weapons give no numbers for these)
  fx    effect lines the planner has no code for ("More critical hits", "Bestows Psynergy", ...)
  price, where
Effect codes (e): 1 HP, 2 HP regen, 3 PP, 4 PP regen, 5 AGL, 6 LCK, 13 AGL multiplier (x10), 15-18 Power,
19-22 Resist (by element V, Me, Ma, J), 27 more encounters. Attack bonuses on armor are added to `a`.
Usage: python3 parse_items.py <weapon.pdf> <armor.pdf> [out.json]
"""
import io, json, os, re, sys
import pymupdf
from PIL import Image

SLOT = {'Weapon': 'w', 'Body': 'b', 'Arm': 'a', 'Head': 'h', 'Feet': 'f', 'Finger': 'r', 'Face': 'g'}
EL_WORD = {'Earth': 0, 'Water': 1, 'Fire': 2, 'Wind': 3}

def element(doc, xref, cache={}):
    """The element ball's colour family: yellow Venus, teal Mercury, red Mars, purple Jupiter."""
    if xref not in cache:
        img = Image.open(io.BytesIO(pymupdf.Pixmap(doc, xref).tobytes('png'))).convert('RGB')
        votes = [0, 0, 0, 0]
        for r, g, b in img.get_flattened_data():
            if r > 200 and 120 < g < 200 and b < 80: votes[0] += 1          # yellow-orange
            elif g > 100 and b > 60 and r < 120: votes[1] += 1              # teal / green
            elif r > 170 and g < 100 and b < 60: votes[2] += 1              # red
            elif r > 100 and b > 120 and g < 140: votes[3] += 1             # purple / pink
        cache[xref] = max(range(4), key=lambda e: votes[e]) if max(votes) >= 4 else None
    return cache[xref]

def lines(path):
    """Every text line (merged spans) and small image in reading order across pages, minus page furniture."""
    doc = pymupdf.open(path); out = []
    for pno, pg in enumerate(doc):
        H = pg.rect.height
        for b in pg.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                sp = [s for s in l['spans'] if s['text'].strip()]
                if not sp: continue
                x0, y0, x1, y1 = l['bbox']
                if y0 < 20 or y1 > H - 15: continue  # browser header/footer
                out.append({'p': pno, 'y': (y0 + y1) / 2, 'x': x0, 't': ' '.join(s['text'].strip() for s in sp),
                            'bold': all('Bold' in s['font'] for s in sp), 'size': sp[0]['size']})
        for im in pg.get_image_info(xrefs=True):
            x0, y0, x1, y1 = im['bbox']
            if im['width'] <= 12: out.append({'p': pno, 'y': (y0 + y1) / 2, 'x': x0, 'el': element(doc, im['xref'])})
            elif im['width'] >= 28: out.append({'p': pno, 'y': (y0 + y1) / 2, 'x': x0, 'icon': True})
    out.sort(key=lambda r: (r['p'], round(r['y']), r['x']))
    return out

def parse(path):
    rows = lines(path); items = []; cur = None
    for i, r in enumerate(rows):
        t = r.get('t')
        if t is None:
            if 'el' in r and cur is not None: cur['_els'].append((r['p'], r['y'], r['el']))
            continue
        if r['bold'] and 70 <= r['x'] <= 110 and not t.endswith(':') and ':' not in t:
            cur = {'n': t, '_right': [], '_els': [], '_left': []}; items.append(cur)
            # the price sits a couple of points above the name, so it sorts just before it
            price = [q for q in rows[max(0, i - 3):i + 3] if q.get('t') and q['p'] == r['p'] and q['x'] > 480 and abs(q['y'] - r['y']) < 6 and re.fullmatch(r'\d+', q['t'])]
            if price: cur['price'] = int(price[0]['t'])
            continue
        if cur is None: continue
        if r['x'] > 480 and re.fullmatch(r'\d+', t): continue  # a price, taken with its name
        if t in ('Back to Top',) or t.startswith('https://'): continue
        if r['x'] > 300: cur['_right'].append((r['p'], r['y'], t)); continue
        m = re.fullmatch(r'(Attack|Defense) \+(\d+)', t)
        if m and 'sl' not in cur: cur['a' if m[1] == 'Attack' else 'd'] = int(m[2]); continue
        m = re.fullmatch(r'(Weapon|Body|Arm|Head|Feet|Finger|Face): ([^()]+?)(?: \((.*)\))?', t)
        if m and 'sl' not in cur:
            cur['sl'], cur['k'], cur['_desc'] = SLOT[m[1]], m[2].strip(), m[3] or ''; continue
        if 'sl' in cur and not r['bold']: cur['_left'].append(t)
    return [finish(it) for it in items if 'sl' in it]

def finish(it):
    out = {'n': it['n'], 'sl': it['sl'], 'k': it['k'], 'a': it.get('a', 0), 'd': it.get('d', 0)}
    desc = it['_desc']; parts = [p.strip() for p in re.split(r',\s*', desc) if p.strip()]
    if any(p.lower() == 'cursed' for p in parts): out['c'] = 1
    use = next((p for p in [desc] if p.lower().startswith('use to ')), None)
    e, fx, ul, problems = [], [], [], []
    for (p, y, t) in it['_right']:
        def el_for():
            near = [x for x in it['_els'] if x[0] == p and abs(x[1] - y) < 5]
            return near[0][2] if near else None
        m = re.fullmatch(r'(Maximum HP|Maximum PP|Agility|Luck|Restore HP|Restore PP|Attack) \+(\d+)', t)
        if it['sl'] != 'w' and m:
            code = {'Maximum HP': 1, 'Maximum PP': 3, 'Agility': 5, 'Luck': 6, 'Restore HP': 2, 'Restore PP': 4}.get(m[1])
            if code: e.append([code, int(m[2])])
            else: out['a'] += int(m[2])
            continue
        m = re.fullmatch(r'Agility \+x(\d+(?:\.\d+)?)', t)
        if m: e.append([13, round(float(m[1]) * 10)]); continue
        m = re.fullmatch(r'(Power|Resist) ([+-]\d+)', t)
        if m:
            el = el_for()
            if el is None: problems.append(f'no element ball for "{t}"')
            else: e.append([(15 if m[1] == 'Power' else 19) + el, int(m[2])])
            continue
        if t == 'Cursed': out['c'] = 1; continue
        if t == 'More encounters': e.append([27, 1]); continue
        if t == 'May break if used.': continue  # folded into `us` below
        if it['sl'] == 'w': ul.append(t); continue
        fx.append(t)
    if e: out['e'] = e
    if ul: out['ul'] = ul
    if fx: out['fx'] = fx
    if use: out['us'] = {'t': use + ('. May break if used.' if any(t == 'May break if used.' for _, _, t in it['_right']) else '')}
    note = ', '.join(p for p in parts if p.lower() != 'cursed' and not p.lower().startswith('use to '))
    if note: out['note'] = note
    if 'price' in it: out['price'] = it['price']
    if it['_left']: out['where'] = ' '.join(it['_left'])
    # Cross-check elements against the description ("Resists Wind & Water", "Boosts elemental Power", "weak against Wind")
    named = {EL_WORD[w] for w in re.findall(r'Earth|Water|Fire|Wind', desc)}
    got = {c - (15 if c < 19 else 19) for c, v in e if 15 <= c <= 22}
    if named and got and named != got: problems.append(f'elements {sorted(got)} vs description "{desc}"')
    if problems: out['_problems'] = problems
    return out

if __name__ == '__main__':
    weapon, armor = sys.argv[1], sys.argv[2]
    here = os.path.dirname(os.path.abspath(__file__))
    dest = sys.argv[3] if len(sys.argv) > 3 else os.path.join(here, 'dditems.json')
    items = parse(weapon) + parse(armor)
    json.dump(items, open(dest, 'w'), indent=1, ensure_ascii=False)
    print(len(items), 'items ->', dest)
