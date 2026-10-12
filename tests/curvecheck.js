const fs = require('fs'); const D = require('../gsdata.json');
const interp = (curve, lv, CK) => { for (let i = 0; i < 5; i++) if (lv <= CK[i + 1]) return Math.floor(curve[i] + (curve[i + 1] - curve[i]) * (lv - CK[i]) / (CK[i + 1] - CK[i])); return curve[5]; };
const H = { 'current [1,20..80,99]': [1, 20, 40, 60, 80, 99], 'levels [0,20..80,100]': [0, 20, 40, 60, 80, 100] };
const rows = [];
function scan(dir, block, charBase, idOff) {
  for (const f of fs.readdirSync(dir).filter(f => /\.(sav|sps)$/.test(f))) {
    const b = fs.readFileSync(dir + f), v = new DataView(b.buffer, b.byteOffset, b.length);
    for (let off = 0; off + block <= b.length; off++) {
      if (b[off] !== 0x43 || b.toString('latin1', off, off + 7) !== 'CAMELOT') continue;
      let s = 0; for (let i = off + 0x10; i < off + block; i++) s += b[i];
      if ((s & 0xffff) === v.getUint16(off + 8, true) && b[off + 7] <= 2)
        for (let k = 0; k < 8; k++) { const c = off + charBase + k * 0x14c; if (b[c + idOff] !== k) continue;
          const lv = b[c + 0xf]; if (!lv) continue;
          rows.push({ f, k, lv, base: [v.getUint16(c + 0x10, true), v.getUint16(c + 0x12, true), v.getUint16(c + 0x18, true), v.getUint16(c + 0x1a, true), v.getUint16(c + 0x1c, true)] }); }
      off += 0xfff;
    }
  }
}
scan('testdata/gtc/golden-sun/game-boy-advance/', 0x1000, 0x510, 0x128);
scan('testdata/gtc/golden-sun-the-lost-age/game-boy-advance/', 0x3000, 0x530, 0x14a);
console.log('samples:', rows.length, 'levels seen:', [...new Set(rows.map(r => r.lv))].sort((a, b) => a - b).join(','));
for (const [name, CK] of Object.entries(H)) {
  const res = [[], [], [], [], []];
  rows.forEach(r => r.base.forEach((x, j) => res[j].push(x - interp(D.chars[r.k].curve[[0, 1, 2, 3, 4][j]], r.lv, CK))));
  const st = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return `mean ${m.toFixed(2)} [${Math.min(...a)}..${Math.max(...a)}]`; };
  console.log(name.padEnd(24), ['HP', 'PP', 'ATK', 'DEF', 'AGL'].map((s, j) => `${s} ${st(res[j])}`).join(' | '));
}
