"""Build planner.html from template + data + logic + icon sets.

Icon sets live in icons/<set>/ (set = 'gba' or 'dd'). Files follow the Golden Sun Universe wiki
naming: 'Warrior's Helm' -> Warriors_Helm.gif (GBA) and Warriors_Helm_DD.gif (Dark Dawn).
Only icons that match an item in the data are embedded, as data URIs.
"""
import base64, json, os, re, sys

d = sys.argv[1] if len(sys.argv) > 1 else '.'
icon_root = sys.argv[2] if len(sys.argv) > 2 else os.path.join(d, 'icons')
data = json.load(open(os.path.join(d, 'gsdata.json')))

ALIASES = json.load(open(os.path.join(d, 'icon_aliases.json'))) if os.path.exists(os.path.join(d, 'icon_aliases.json')) else {}
MIME = {'.gif': 'image/gif', '.png': 'image/png'}

def icon_key(name, icon_set):
    k = re.sub(r"['’.]", '', name)
    k = re.sub(r'[^A-Za-z0-9]+', '_', k).strip('_')
    return k + '_DD' if icon_set == 'dd' else k

wanted = {s: {} for s in ('gba', 'dd')}  # set -> {key: [item names]}
dd_items = json.load(open(os.path.join(d, 'dddata.json'))).get('items') or {}
names = {'gba': [it['n'] for it in data['items'].values()] + ['Mysterious Card', "Trainer's Whip", 'Tomegathericon'],
         'dd': [it['n'] for it in dd_items.values()]}  # each set only embeds icons its own game's items use
for s in wanted:
    for n in names[s]:
        k = ALIASES.get(s, {}).get(n, icon_key(n, s))
        wanted[s].setdefault(k, []).append(n)

icons = {s: {} for s in wanted}
report = {}
for s in wanted:
    folder = os.path.join(icon_root, s)
    files = {}
    if os.path.isdir(folder):
        for root, _, fs in os.walk(folder):
            for f in fs:
                stem, ext = os.path.splitext(f)
                if ext.lower() in MIME:
                    files.setdefault(stem.lower(), os.path.join(root, f))
    for k in wanted[s]:
        p = files.get(k.lower())
        if p:
            b64 = base64.b64encode(open(p, 'rb').read()).decode()
            icons[s][k] = f'data:{MIME[os.path.splitext(p)[1].lower()]};base64,{b64}'
    missing = sorted({n for k, ns in wanted[s].items() if k not in icons[s] for n in ns})
    report[s] = {'files_found': len(files), 'embedded': len(icons[s]), 'items_without_icon': len(missing), 'missing': missing}

# ---- UI skin assets (portraits, element stars, Psynergy icons) ----
def uri(path):
    return 'data:image/gif;base64,' + base64.b64encode(open(path, 'rb').read()).decode()
ui_dir = os.path.join(d, 'ui')
PORTRAIT = {'Isaac': 'Isaac2', 'Garet': 'Garet2', 'Ivan': 'Ivan', 'Mia': 'Mia', 'Felix': 'Felix2', 'Jenna': 'Jenna2', 'Sheba': 'Sheba', 'Piers': 'Picard',
            'Matthew': 'Matthew_DD', 'Tyrell': 'Tyrell_DD', 'Karis': 'Karis_DD', 'Rief': 'Rief_DD', 'Amiti': 'Amiti_DD', 'Sveta': 'Sveta_DD', 'Eoleo': 'Eoleo_DD', 'Himi': 'Himi_DD'}
PSY_ALIAS = {'Annihilation': 'Annihalation', 'Guard': 'Gaurd', 'Guardian': 'Gaurdian', 'Thunderhead': 'Thunderstorm'}
ui = {'portrait': {}, 'star': [], 'frame': None, 'psy': {}}
if os.path.isdir(ui_dir):
    for c, f in PORTRAIT.items():
        fp = os.path.join(ui_dir, 'portraits', f + '.gif')
        if os.path.exists(fp): ui['portrait'][c] = uri(fp)
    ui['star'] = [uri(os.path.join(ui_dir, 'misc', e + '_Star.gif')) for e in ('Venus', 'Mercury', 'Mars', 'Jupiter')]
    ui['frame'] = uri(os.path.join(ui_dir, 'misc', 'frame.gif'))
    norm = lambda x: re.sub(r'[^a-z0-9]', '', x.lower())
    files = {norm(os.path.splitext(f)[0]): os.path.join(ui_dir, 'psynergy', f) for f in os.listdir(os.path.join(ui_dir, 'psynergy'))}
    for a in data['abil'].values():
        k = norm(PSY_ALIAS.get(a['n'], a['n']))
        if k in files: ui['psy'][a['n']] = uri(files[k])
report['psynergy_icons'] = {'matched': len(ui['psy']), 'of': len({a['n'] for a in data['abil'].values()})}

t = open(os.path.join(d, 'template.html')).read()
t = (t.replace('__DDDATA__', open(os.path.join(d, 'dddata.json')).read())
      .replace('__DATA__', json.dumps(data, separators=(',', ':')))
      .replace('__ICONS__', json.dumps(icons, separators=(',', ':')))
      .replace('__UI__', json.dumps(ui, separators=(',', ':')))
      .replace('__ICON_ALIASES__', json.dumps(ALIASES, separators=(',', ':')))
      .replace('__LOGIC__', open(os.path.join(d, 'logic.js')).read())
      .replace('__ENDGAME__', open(os.path.join(d, 'endgame.js')).read())
      .replace('__SAVEPARSE__', open(os.path.join(d, 'saveparse.js')).read()))
out = os.path.join(d, 'planner.html')
open(out, 'w').write(t)
json.dump(report, open(os.path.join(d, 'icon_report.json'), 'w'), indent=1)
print('built', out, len(t), 'bytes |', ', '.join(f"{s}: {r['embedded']} icons embedded, {r['items_without_icon']} items without" for s, r in report.items() if 'embedded' in r), '| psynergy icons:', report['psynergy_icons'])
