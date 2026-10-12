"""Build dddata.json (Dark Dawn) from the Golden Sun Syndicate class/djinn tables saved in this folder.
Psynergy details are borrowed from The Lost Age data by name where the name matches."""
import json, re, sys
here = sys.argv[1]; gs = json.load(open(sys.argv[2]))
cls = json.load(open(f'{here}/ddclasses.json'))
ELN = {'VENUS': 0, 'MERCURY': 1, 'MARS': 2, 'JUPITER': 3}
djinn = []
for ln in open(f'{here}/djinn.txt'):
    e, n, s = [x.strip() for x in ln.split('|')]
    djinn.append({'n': n, 'e': ELN[e], 's': [int(x) for x in s.split()]})
assert len(djinn) == 72 and all(sum(d['e'] == e for d in djinn) == 18 for e in range(4))
# Psynergy: reuse TLA entries by name; unknown ones get element 4 (unknown) and no figures
by_name = {}
for a in gs['abil'].values(): by_name.setdefault(a['n'], a)
abil, ids = {}, {}
def aid(n):
    if n not in ids:
        ids[n] = len(ids) + 1
        a = by_name.get(n)
        abil[ids[n]] = dict(a, dd=True) if a else {'n': n, 'e': 4, 'd': 0, 'p': 0, 'r': 0, 'c': 0, 'unk': True}
    return ids[n]
series, chars = {}, []
for ci, (name, c) in enumerate(cls.items()):
    lines = []
    for li, L in enumerate(c['lines']):
        tiers = L['tiers']; tn = [t['n'] for t in tiers]
        sid = f'd{ci}_{li}'
        def tidx(label):
            for k, nm in enumerate(tn):
                if nm.lower() == label.lower(): return k
            return None
        out_t = []
        for ti, t in enumerate(tiers):
            psy = []
            for pn, lv, note in L['psy']:
                show = pn
                m = re.search(r'(?:transforms to|becomes) (.+?) after (.+?)(?: class)?$', note)
                r = re.search(r'(?:higher than|above|req >|class above|class must be higher than) (.+)$|^(.+?) or higher$', note)
                if m:
                    k = tidx(m.group(2))
                    if k is not None and ti >= k: show = m.group(1)
                elif r:
                    k = tidx((r.group(1) or r.group(2)).strip())
                    if k is not None and ti < k: continue   # restriction is "this tier or higher" (checked against TLA tables)
                psy.append([aid(show), lv])
            out_t.append({'name': t['n'], 'req': t['req'], 'mult': t['mult'], 'psy': psy})
        series[sid] = {'name': L['line'].rstrip('12'), 'tiers': out_t}
        lines.append(sid)
    mono = next(s for s in lines if all(v == 0 for v in series[s]['tiers'][0]['req']))
    chars.append({'name': name, 'el': c['el'], 'lines': lines, 'mono': mono,
                  'curve': [[0] * 6 for _ in range(6)], 'aff': [3, 3, 3, 3]})
data = {'chars': chars, 'series': series, 'abil': abil, 'djinn': djinn, 'items': {}, 'boost': gs['boost'], 'dd': True}
json.dump(data, open(f'{here}/dddata.json', 'w'), separators=(',', ':'))
unk = [a['n'] for a in abil.values() if a.get('unk')]
print('chars', len(chars), 'series', len(series), 'psy', len(abil), 'unknown psy', len(unk))
