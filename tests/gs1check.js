const fs = require('fs'); const G = require('../logic.js'); const D = require('../gsdata.json');
const ITEMS = JSON.parse(fs.readFileSync('archipelago-data/items.json'));
const dir = 'testdata/gtc/golden-sun/game-boy-advance/';
let n = 0, hp = 0, pw = 0, rs = 0, curveDiff = [];
for (const f of fs.readdirSync(dir).filter(f => /\.(sav|sps)$/.test(f))) {
  const b = fs.readFileSync(dir + f), v = new DataView(b.buffer, b.byteOffset, b.length);
  const slots = [];
  for (let off = 0; off + 0x1000 <= b.length; off++) {
    if (b[off] !== 0x43 || b.toString('latin1', off, off + 7) !== 'CAMELOT') continue;
    const slot = b[off + 7]; let s = 0; for (let i = off + 0x10; i < off + 0x1000; i++) s += b[i];
    const ok = (s & 0xffff) === v.getUint16(off + 8, true);
    if (ok && slot <= 2) slots.push(off);
    off += 0xfff;
  }
  for (const off of slots) {
    const mask = b[off + 0x50], order = [...b.slice(off + 0x448, off + 0x44c)];
    const out = [];
    for (let k = 0; k < 4; k++) {
      const c = off + 0x510 + k * 0x14c, id = b[c + 0x128];
      const lv = b[c + 0xf], base = [v.getUint16(c + 0x10, true), v.getUint16(c + 0x12, true), v.getUint16(c + 0x18, true), v.getUint16(c + 0x1a, true), v.getUint16(c + 0x1c, true), b[c + 0x1e]];
      const curve = D.chars[k].curve.map(cv => G.baseStat(cv, lv));
      curveDiff.push(base.map((x, j) => x - curve[j]));
      const cnt = [0, 0, 0, 0], dj = [0, 0, 0, 0, 0, 0]; const names = [];
      for (let e = 0; e < 4; e++) { const own = v.getUint32(c + 0xf8 + 4 * e, true), st = v.getUint32(c + 0x108 + 4 * e, true);
        for (let i = 0; i < 18; i++) if ((own >> i) & 1) { names.push(D.djinn[e * 18 + i].n); if ((st >> i) & 1) { cnt[e]++; D.djinn[e * 18 + i].s.forEach((x, j) => dj[j] += x); } } }
      const eq = []; const inv = [];
      for (let i = 0; i < 15; i++) { const lo = b[c + 0xd8 + 2 * i], hi = b[c + 0xd9 + 2 * i], iid = lo + (hi & 1 ? 256 : 0); if (!iid) continue; inv.push((ITEMS[iid] ? ITEMS[iid].name : '?' + iid) + (hi & 2 ? '*' : '')); if (hi & 2 && D.items[iid]) eq.push(D.items[iid]); }
      const cls = G.determineClass(D.chars[k], cnt, null, D), tier = D.series[cls.sid].tiers[cls.ti];
      const gear = G.gearEffects(eq);
      const fin = G.finalStats(base.map((x, j) => x + dj[j] + gear.flat[j]), tier.mult, gear);
      const el = G.elemental(D.chars[k].aff, cls.L, gear);
      const sHP = v.getUint16(c + 0x34, true), sPP = v.getUint16(c + 0x36, true);
      const sPow = [0, 1, 2, 3].map(e => v.getUint16(c + 0x24 + 4 * e, true)), sRes = [0, 1, 2, 3].map(e => v.getUint16(c + 0x26 + 4 * e, true));
      n++; if (fin[0] === sHP && fin[1] === sPP) hp++; if (el.pow.join() === sPow.join()) pw++; if (el.res.join() === sRes.join()) rs++;
      out.push(`${D.chars[k].name}(id${id}) Lv${lv} ${tier.name} HP ${fin[0]}/${sHP} PP ${fin[1]}/${sPP} pow ${el.pow.join()==sPow.join()?'ok':el.pow+' vs '+sPow} dj[${names}] inv[${inv.join(', ')}]`);
    }
    if (f === 'europeusa.sav') console.log(f, 'slot@' + off.toString(16), 'mask', mask.toString(2), 'order', order, '\n  ' + out.join('\n  '));
  }
}
console.log(`characters ${n}: HP+PP match ${hp}, Power match ${pw}, Resistance match ${rs}`);
console.log('base minus curve (HP,PP,ATK,DEF,AGL,LCK) sample:', JSON.stringify(curveDiff.slice(0, 8)));
