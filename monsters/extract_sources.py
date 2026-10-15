"""Add where a piece of gear comes from to gsdata.json, so the planner knows how many copies the party can have.

  dr  bitmask of the games where a monster drops it (1 The Broken Seal, 2 The Lost Age), from monsters.json (ROM data).
  fg  The Lost Age: the forge material Sunshine turns into it, when a monster drops that material (so it's unlimited).
      A material only found in chests (the Rusty weapons) adds its chest count to ch instead. Forge table at 0x10CC34 in the US ROM, 36-byte records:
      u16 material, u16 0, 8 x u16 results, 8 x u16 weights; 20 records, ending at material 0xFFFF. Matches the
      Archipelago randomizer's forgeables.json (cjmang/Archipelago, worlds/gstla/data) record for record.
  ch  The Lost Age: how many chests, hidden spots and events hold it, from that randomizer's item_locations.json
      (vanilla contents; not read from the ROM, so unverified here).
  forge (top level) material id -> name, for the page to say what an item is forged from.
Only equipment gets these; the page treats shop, dropped and forged-from-a-dropped-material gear as unlimited.
Usage: python3 extract_sources.py <The Lost Age.gba> <item_locations.json>
"""
import json, os, re, struct, sys
from collections import Counter
sys.path.insert(0, HERE := os.path.dirname(os.path.abspath(__file__)))
from gstext import Text, show

DATA = os.path.join(HERE, '..', 'gsdata.json')
FORGE, REC = 0x10CC34, 36

if __name__ == '__main__':
    rom = open(sys.argv[1], 'rb').read()
    if rom[0xAC:0xB0] != b'AGFE': raise SystemExit('not the US The Lost Age ROM')
    locs = json.load(open(sys.argv[2]))
    d = json.load(open(DATA)); items = d['items']
    norm = lambda s: re.sub(r'[^A-Za-z0-9]', '', s).lower()
    by_name = {}
    for k, it in items.items(): by_name.setdefault(norm(it['n']), []).append(int(k))
    gear = {int(k) for k, it in items.items() if it.get('sl')}
    for it in items.values():
        for f in ('dr', 'fg', 'ch'): it.pop(f, None)

    mons = json.load(open(os.path.join(HERE, '..', 'monsters.json')))
    T = Text(rom, 0x60C30, 0xA9F54, 49)
    rom_name = lambda i: re.sub(r'^(\{[0-9a-f]+\})+', '', show(T.line(607 + i)))
    tla_drops = {norm(m['drop']) for m in mons['tla'] if m.get('drop')}
    skipped = set()   # drops that aren't gear (gsdata only holds gear): printed so a misspelt gear name shows up
    for bit, game in ((1, 'gs1'), (2, 'tla')):
        for m in mons[game]:
            if not m.get('drop'): continue
            ids = by_name.get(norm(m['drop']))
            if not ids: skipped.add(m['drop']); continue
            for i in ids:
                if i in gear: items[str(i)]['dr'] = items[str(i)].get('dr', 0) | bit

    # One entry per location (a location can be listed once per map it shows on); 0x8000+ is coins
    held = Counter(ls[0]['vanillaContents'] for ls in locs.values() if ls and ls[0]['vanillaContents'] < 0x8000)
    for i, n in held.items():
        if i in gear: items[str(i)]['ch'] = n

    n_forge, d['forge'] = 0, {}
    for r in range(40):
        a = FORGE + REC * r
        mat = struct.unpack_from('<H', rom, a)[0]
        if mat == 0xFFFF: break
        for res in struct.unpack_from('<8H', rom, a + 4):
            if res not in gear: continue
            n_forge += 1
            if norm(rom_name(mat)) in tla_drops: items[str(res)]['fg'] = mat; d['forge'][str(mat)] = rom_name(mat)
            elif held[mat]: items[str(res)]['ch'] = items[str(res)].get('ch', 0) + held[mat]
    else: raise SystemExit('forge table did not end where expected')

    print('not gear:', ', '.join(sorted(skipped)))
    json.dump(d, open(DATA, 'w'), separators=(',', ':'), ensure_ascii=False)
    print(sum('dr' in it for it in items.values()), 'dropped,', n_forge, 'forged,', sum('ch' in it for it in items.values()), 'found')
