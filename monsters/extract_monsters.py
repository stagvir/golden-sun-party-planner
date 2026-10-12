"""Extract the GBA Golden Sun monster tables from the user's own ROMs into monsters.json (the ROMs are never committed).

Enemy records (US ROMs; offsets from each record's level byte, which follows a 15-byte blank name field):
  The Lost Age   76-byte records, enemy id n at 0xB9E3F + 76n, ids 1-379 (377 used, as in the Archipelago export)
  The Broken Seal 84-byte records, id n at 0x80ED7 + 84n, ids 0-163 (its item block is 10 bytes longer)
  Empty slots and the "???" placeholder (level 0, HP 18) are skipped.
  +0 level, +1 HP, +3 PP, +5 ATK, +7 DEF, +9 AGL (16-bit), +11 LCK, +12 turns, +13 HP regen, +14 PP regen,
  then (TLA / GS1) elemental table +27/+37, attacks +31/+41 (8 x 16-bit ability ids), coins +51/+61, drop item
  +53/+63, drop code +55/+65, EXP +57/+67.
Elemental tables (24 bytes: a byte 'el' of unknown meaning, 3 pad, 4 levels, then Power/Resistance pairs per element):
TLA 0xC6684, GS1 0x88E38. 'el' is 4 for most enemies, even plainly Mars ones like Agatio, so the page takes a
monster's element from its highest elemental level instead.
Names come from the game text: enemies at line 1067 / 655 + id, abilities 1447 / 819 + id, items 607 / 386 + id.
Drop code n is a 1/2^(n-1) chance (code 9 = 1/256: Cruel Dragon's Tisiphone Edge, per the Golden Sun wiki).
Checked: TLA stats match the Archipelago export and the wiki spot checks (Phoenix, Anger Ball, Living Armor, ...).
Usage: python3 extract_monsters.py <The Lost Age.gba> <The Broken Seal.gba>
"""
import json, os, re, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gstext import Text, show

GAMES = {
    'tla': dict(code=b'AGFE', text=(0x60C30, 0xA9F54, 49), first=0xB9E3F, size=76, ids=range(1, 380), el=0xC6684,
                off=dict(el=27, atk=31, coins=51, drop=53, rate=55, exp=57), names=1067, abil=1447, items=607),
    'gs1': dict(code=b'AGSE', text=(0x3842C, 0x736B8, 42), first=0x80ED7, size=84, ids=range(0, 164), el=0x88E38,
                off=dict(el=37, atk=41, coins=61, drop=63, rate=65, exp=67), names=655, abil=819, items=386),
}
clean = lambda s: re.sub(r'^(\{[0-9a-f]+\})+', '', s)

def extract(path, g):
    r = open(path, 'rb').read()
    if r[0xAC:0xB0] != g['code']: raise SystemExit(f'{path}: not the US ROM this layout is for ({r[0xAC:0xB0]})')
    T = Text(r, *g['text']); line = lambda i: clean(show(T.line(i)))
    u16 = lambda p: struct.unpack_from('<H', r, p)[0]
    out = []
    for k in g['ids']:
        L = g['first'] + g['size'] * k; o = g['off']
        hp = u16(L + 1)
        if hp == 0 or (r[L] == 0 and hp == 18): continue   # empty slot / placeholder
        t = g['el'] + 24 * r[L + o['el']]
        drop, code = u16(L + o['drop']), u16(L + o['rate'])
        atk = [u16(L + o['atk'] + 2 * i) for i in range(8)]
        out.append({
            'id': k, 'n': line(g['names'] + k), 'lv': r[L], 'hp': hp, 'pp': u16(L + 3), 'atk': u16(L + 5), 'def': u16(L + 7),
            'agl': u16(L + 9), 'lck': r[L + 11], 'turns': r[L + 12], 'hpRegen': r[L + 13], 'ppRegen': r[L + 14],
            'el': r[t], 'elv': list(r[t + 4:t + 8]), 'pow': [u16(t + 8 + 4 * e) for e in range(4)], 'res': [u16(t + 10 + 4 * e) for e in range(4)],
            'moves': [line(g['abil'] + a) for a in atk if a], 'moveIds': [a for a in atk if a],
            'coins': u16(L + o['coins']), 'exp': u16(L + o['exp']),
            'drop': line(g['items'] + drop) if drop else None, 'dropChance': (1 / 2 ** (code - 1)) if drop and code else None,
        })
    return out

if __name__ == '__main__':
    tla, gs1 = sys.argv[1:3]
    data = {'tla': extract(tla, GAMES['tla']), 'gs1': extract(gs1, GAMES['gs1'])}
    dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'monsters.json')
    json.dump(data, open(dest, 'w'), separators=(',', ':'))
    for k, v in data.items(): print(k, len(v), 'monsters')
