import json, re, sys, collections
CH = [('Matthew',0,'matthew'),('Tyrell',2,'tyrell'),('Karis',3,'karis'),('Rief',1,'rief'),('Amiti',1,'amiti'),('Sveta',3,'sveta'),('Eoleo',2,'eoleo'),('Himi',0,'himi')]
EL = {'V':0,'Me':1,'Ma':2,'J':3}
out = {}
for name, el, f in CH:
    lines = collections.OrderedDict(); psy = {}
    for ln in open(f + '.txt'):
        ln = ln.strip()
        if not ln: continue
        m = re.match(r'^(.+?) PSY: (.*)$', ln)
        if m:
            items = []
            for part in re.findall(r'([^,\[]+?@\d+)\s*(\[[^\]]*\])?(?:,|$)', m.group(2)):
                nm, lv = part[0].strip().rsplit('@', 1)
                note = part[1].strip('[] ') if part[1] else ''
                items.append([nm.strip(), int(lv), note])
            psy[m.group(1).strip()] = items; continue
        line, tier, req, mult = [x.strip() for x in ln.split('|')]
        r = [0,0,0,0]
        for k, v in re.findall(r'(Me|Ma|V|J)(\d)', req): r[EL[k]] = int(v)
        lines.setdefault(line, []).append({'n': tier, 'req': r, 'mult': [int(x) for x in re.findall(r'(\d+)%', mult)]})
    out[name] = {'el': el, 'lines': [{'line': k, 'tiers': v, 'psy': psy.get(k, [])} for k, v in lines.items()]}
    miss = [k for k in lines if k not in psy]
    if miss: print(name, 'no psy for', miss)
json.dump(out, open('ddclasses.json', 'w'), indent=0)
# consistency: same tier name in same-named line -> same multipliers
seen = {}
for n, c in out.items():
    for L in c['lines']:
        for t in L['tiers']:
            k = (L['line'].rstrip('12'), t['n'])
            if k in seen and seen[k][0] != t['mult']: print('MULT DIFF', k, seen[k], n, t['mult'])
            seen.setdefault(k, (t['mult'], n))
print('ok', {n: len(c['lines']) for n, c in out.items()})
