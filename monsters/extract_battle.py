"""Add battle data the damage calculator needs to gsdata.json, from the owner's US The Lost Age ROM.

Weapon element: item table at 0xB2364, 44-byte records (layout from the Alchemy decompilation's ItemDefinition:
attack s16 at +0x08, element s32 at +0x14, 0-3 V/Me/Ma/J, 4 none). A party member's plain Attack uses it
(Item_GetEquippedElement). Only 12 weapons have one (Fire Brand, Gaia Blade, Elven Rapier, ...).
The item ids are the planner's (gsdata.json keys), checked here against the item names in the game text.
Usage: python3 extract_battle.py <The Lost Age.gba>
"""
import json, os, re, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gstext import Text, show

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'gsdata.json')
TABLE, SIZE = 0xB2364, 44

if __name__ == '__main__':
    rom = open(sys.argv[1], 'rb').read()
    if rom[0xAC:0xB0] != b'AGFE': raise SystemExit('not the US The Lost Age ROM')
    T = Text(rom, 0x60C30, 0xA9F54, 49)
    name = lambda i: re.sub(r'^(\{[0-9a-f]+\})+', '', show(T.line(607 + i)))
    norm = lambda s: re.sub(r'[^A-Za-z0-9]', '', s).lower()   # the planner's names drop hyphens (One-Piece Dress)
    d = json.load(open(DATA))
    n = 0
    for k, it in d['items'].items():
        i = int(k); rec = rom[TABLE + SIZE * i: TABLE + SIZE * (i + 1)]
        if norm(name(i)) != norm(it['n']): raise SystemExit(f'item {i}: ROM says {name(i)!r}, gsdata says {it["n"]!r}')
        if struct.unpack_from('<h', rec, 8)[0] != it['a'] and it['sl'] == 'w': raise SystemExit(f'{it["n"]}: attack differs')
        el = struct.unpack_from('<i', rec, 0x14)[0]
        it.pop('el', None)
        if it['sl'] == 'w' and 0 <= el <= 3: it['el'] = el; n += 1
    json.dump(d, open(DATA, 'w'), separators=(',', ':'), ensure_ascii=False)
    print(n, 'weapons with an element')
