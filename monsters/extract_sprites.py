"""Make battle sprite GIFs for The Lost Age monsters that have none in ui/monsters, from the owner's US ROM.

How the game draws an enemy (US The Lost Age; addresses are ROM offsets):
  Battle unit table   0x130D0C, 8 bytes per unit; enemy id n is unit n + 7. +0 u16 sprite id; byte +3, bits 1-4:
                      colour variant (0 = none, 1-5 = remap table 1-5). Read by 0x081280BC / 0x081280D8.
  Sprite records      0x300000, 20 bytes per sprite id: width, height, u16 scale, draw mode, ..., codec at +10, frame
                      list pointer at +12. Draw mode 20 is a two-part sprite: this id on the left, id + 1 on the right
                      (Serpent, Fusion Dragon, Doom Dragon). Codec 2 frames come from a monster sheet, codec 0 frames
                      (Dullahan, Poseidon, Doom Dragon) are zero-skip streams the frame list points at.
  Sprite -> resource  0x2E91C, pairs of u16 (resource, sprite), ending at sprite 0 (used by the loader 0x080227E0).
  Resource directory  0x680000, one ROM pointer per resource. Resource r is entry r + 1 here (entry 1 points at the
                      table itself), which this script's numbering already includes.
  Monster sheet       packer stream: tag 0 = LZ (see unpack_general), tag 1 = byte LZ. Unpacked: u32 offsets to each
                      frame, ending in 0, then zero-skip frames (bytes 1-0xDF a pixel, 0xE0+k k+1 blank pixels, 0
                      ends). Frames are the record's size (zero-skip may stop before trailing blanks), front and back of each pose alternating.
  Colour remap        0x203A8, ten 256-byte tables (224 used); variant v swaps each pixel index p for table[v-1][p].
  System palette      0x17B10, 224 BGR555 colours; index 0 is transparent.
Deadbeard has no sprite in the table (unit entry is blank).
Checked: 270 of the 272 monsters that already had a GIF get the same sheet and colours from these tables (the other two
GIFs, Kobold and Lich, were the wrong variant). The animation is the front frames 0, 2, 4, 2 at 350 ms, which is how
the existing GIFs play; the game's own animation scripts aren't read.
sprites.json maps a name to a file; a "tla:" or "gs1:" key holds a game's own picture where the two games share a name but
not a sprite (Kobold, Lich). The page tries that key first.
Usage: python3 extract_sprites.py <The Lost Age.gba> [--all]   (--all also redoes monsters that already have one)
"""
import json, os, re, struct, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'ui', 'monsters')

def unpack_general(d, pos):
    """Tag-0 stream: LSB-first bits read in 16-bit words. 1 + 8 bits = literal; 0 + length code + distance = copy."""
    assert d[pos] == 0
    st = {'p': pos + 1, 'v': 0, 'n': 0}
    if st['p'] & 1: st['v'], st['n'], st['p'] = d[st['p']], 8, st['p'] + 1
    def get(k):
        while st['n'] < k:
            st['v'] |= (d[st['p']] | d[st['p'] + 1] << 8) << st['n']; st['p'] += 2; st['n'] += 16
        x = st['v'] & ((1 << k) - 1); st['v'] >>= k; st['n'] -= k; return x
    get(0)
    out = bytearray()
    while True:
        if get(1): out.append(get(8)); continue
        L = None
        for n in (2, 3, 4, 5):
            if not get(1): L = n; break
        if L is None:
            if not get(1): L = 7 if get(1) else 6
            else:
                s = get(2)
                if s: L = s + 7
                else:
                    l = get(7)
                    if l == 0: return bytes(out)
                    L = l + 10
        if get(1): dist = get(5) + 1
        else:
            w = len(out) - 33
            dist = get(w.bit_length() if 0 <= w < 2048 else 12) + 33
        for _ in range(L): out.append(out[-dist])

def unpack_bytes(d, pos):
    """Tag-1 stream: flag bytes, 8 operations each (bit set = 2-byte copy: 12-bit distance, 4-bit length)."""
    out = bytearray(); p = pos + 1
    while True:
        flags = d[p]; p += 1
        if flags == 0: out += d[p:p + 8]; p += 8; continue
        for bit in range(7, -1, -1):
            if not flags & (1 << bit): out.append(d[p]); p += 1; continue
            a, c = d[p], d[p + 1]; p += 2
            dist = (a & 0xf0) << 4 | c; L = a & 0x0f
            if L == 0:
                if dist == 0: return bytes(out)
                L = d[p] + 17; p += 1
            else: L += 1
            for _ in range(L): out.append(out[-dist])

def sheet(rom, res):
    o = struct.unpack_from('<I', rom, 0x680000 + 4 * res)[0] - 0x08000000
    d = unpack_general(rom, o) if rom[o] == 0 else unpack_bytes(rom, o)
    frames, i, first = [], 0, len(d)   # the offset table ends at a 0 or where the first frame starts
    while 4 * i < first and (off := struct.unpack_from('<I', d, 4 * i)[0]):
        first = min(first, off)
        frames.append(zero_skip(d, off) if off < len(d) else b''); i += 1   # an offset at the end: empty frame
    return frames

def zero_skip(d, p):
    px = bytearray()
    while (c := d[p]):
        p += 1; px += bytes(c - 0xdf) if c > 0xdf else bytes([c])
    return bytes(px)

def sprite_frames(rom, spr, s2r):
    """A sprite's frames, padded to its record's size: codec 2 from its monster sheet, codec 0 from its frame list."""
    rec = 0x300000 + 20 * spr
    w, h, codec = rom[rec], rom[rec + 1], rom[rec + 10]
    if codec == 2 and spr in s2r: fr = sheet(rom, s2r[spr])
    elif codec == 0:
        fr, o = [], struct.unpack_from('<I', rom, rec + 12)[0] - 0x08000000
        while len(fr) < 6 and (q := struct.unpack_from('<I', rom, o)[0]):
            fr.append(zero_skip(rom, q - 0x08000000)); o += 4
    else: return None
    return [f[:w * h] + bytes(w * h - len(f[:w * h])) for f in fr], w, h

def enemy_sprite(rom, enemy_id):
    """(frames, size, remap or None) for an enemy id, as the battle code picks them."""
    u = 0x130D0C + 8 * (enemy_id + 7)
    spr, variant = struct.unpack_from('<H', rom, u)[0], (rom[u + 3] >> 1) & 15
    s2r, o = {}, 0x2E91C
    while (pair := struct.unpack_from('<HH', rom, o))[1]: s2r[pair[1]] = pair[0]; o += 4
    got = sprite_frames(rom, spr, s2r) if spr else None
    if not got: return None
    fr, w, h = got
    if rom[0x300000 + 20 * spr + 4] == 20:   # drawn in two halves: this sprite on the left, the next on the right
        right, _, _ = sprite_frames(rom, spr + 1, s2r)
        fr = [b''.join(a[y * w:(y + 1) * w] + c[y * w:(y + 1) * w] for y in range(h)) for a, c in zip(fr, right)]
        w *= 2
    remap = rom[0x203A8 + 256 * (variant - 1): 0x203A8 + 256 * (variant - 1) + 224] if 1 <= variant <= 5 else None
    return fr, (w, h), remap

def gif(rom, frames, size, remap, path):
    pal = [struct.unpack_from('<H', rom, 0x17B10 + 2 * i)[0] for i in range(224)]
    flat = [0, 0, 0]  # index 0: transparent
    for c in pal[1:]: flat += [(c & 31) << 3, (c >> 5 & 31) << 3, (c >> 10 & 31) << 3]
    ims = []
    for k in (0, 2, 4, 2):
        if k >= len(frames): continue
        px = frames[k] if remap is None else bytes(remap[p] if p else 0 for p in frames[k])
        im = Image.frombytes('P', size, px); im.putpalette(flat + [0] * (768 - len(flat))); ims.append(im)
    ims[0].save(path, save_all=True, append_images=ims[1:], duration=350, loop=0, transparency=0, disposal=2, optimize=False)

if __name__ == '__main__':
    rom = open(sys.argv[1], 'rb').read()
    if rom[0xAC:0xB0] != b'AGFE': raise SystemExit('not the US The Lost Age ROM')
    redo = '--all' in sys.argv
    mons = json.load(open(os.path.join(HERE, '..', 'monsters.json')))['tla']
    index_path = os.path.join(OUT, 'sprites.json'); index = json.load(open(index_path))
    made = []
    for m in mons:
        if (m['n'] in index or 'tla:' + m['n'] in index) and not redo: continue
        got = enemy_sprite(rom, m['id'])
        if not got: print('no sprite for', m['n']); continue
        fname = re.sub(r'[^A-Za-z0-9]+', '_', m['n']).strip('_') + '.gif'
        gif(rom, *got, os.path.join(OUT, fname)); index[m['n']] = fname; made.append(m['n'])
    json.dump(dict(sorted(index.items())), open(index_path, 'w'), indent=0)
    print(len(made), 'sprites made:', ', '.join(made))
