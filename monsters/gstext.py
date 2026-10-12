"""Golden Sun (GBA) text decoder.

Text lines sit in blocks of 256: a pointer table holds, per block, the compressed bitstream and a table of line
lengths (bytes; 0xFF continues). Each character is Huffman-coded with a tree chosen by the previous character: the
tree is a pre-order bit string (0 = branch, 1 = leaf; a text bit of 1 means skip the left subtree) and its leaves are
12-bit character codes stored backwards just before the tree. Tables: The Lost Age 0x60C30 / 0xA9F54, The Broken
Seal 0x3842C / 0x736B8 (US ROMs). Checked against the 267 Lost Age enemy names in the Archipelago data.
"""
import struct, sys
class Text:
    def __init__(self, rom, tree_tab, ptr_tab, nblocks):
        self.r = rom; self.tt = tree_tab; self.pt = ptr_tab; self.nb = nblocks
    def u32(self, a): return struct.unpack_from('<I', self.r, a)[0]
    def u16(self, a): return struct.unpack_from('<H', self.r, a)[0]
    def bit(self, bitaddr): return (self.r[bitaddr >> 3] >> (bitaddr & 7)) & 1
    def bits12(self, bitaddr):
        v = 0
        for k in range(12): v |= self.bit(bitaddr + k) << k
        return v
    def tree_for(self, prev):
        blk = self.tt + ((prev >> 8) << 3)
        data, offs = self.u32(blk) & 0x1FFFFFF, self.u32(blk + 4) & 0x1FFFFFF
        o = self.u16(offs + ((prev & 0xFF) << 1))
        if o == 0x8000: return None
        return data + o
    def line(self, idx, maxlen=400):
        blk = self.pt + ((idx >> 8) << 3)
        src = (self.u32(blk) & 0x1FFFFFF) * 8; lens = self.u32(blk + 4) & 0x1FFFFFF
        for _ in range(idx & 0xFF):
            while True:
                l = self.r[lens]; lens += 1; src += l * 8
                if l != 0xFF: break
        out, prev = [], 0
        for _ in range(maxlen):
            t = self.tree_for(prev)
            if t is None: break
            tp, leaf = t * 8, 0
            while True:
                if self.bit(tp): tp += 1; break
                tp += 1
                b = self.bit(src); src += 1
                if b:   # skip the left subtree
                    need = 1
                    while need:
                        if self.bit(tp): need -= 1; leaf += 1
                        else: need += 1
                        tp += 1
            ch = self.bits12(t * 8 - 12 * (leaf + 1))
            if ch == 0: break
            out.append(ch); prev = ch
        return out
def show(codes):
    return ''.join(chr(c) if 32 <= c < 127 else f'{{{c:x}}}' for c in codes)
if __name__ == '__main__':  # python3 gstext.py <rom> <treeTable hex> <ptrTable hex> <blocks> <line>...
    rom = open(sys.argv[1], 'rb').read()
    tt, pt, nb = int(sys.argv[2], 16), int(sys.argv[3], 16), int(sys.argv[4])
    T = Text(rom, tt, pt, nb)
    for i in [int(x) for x in sys.argv[5:]]: print(i, show(T.line(i)))
