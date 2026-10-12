const fs = require('fs'); const G = require('../logic.js'); const D = require('../gsdata.json');
const ITEMS = JSON.parse(fs.readFileSync('archipelago-data/items.json'));
const dir = 'testdata/gtc/golden-sun-the-lost-age/game-boy-advance/';
let tot = 0, hpOK = 0, ppOK = 0, powOK = 0, resOK = 0; const bad = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.sav'))) {
  const b = fs.readFileSync(dir + f); const v = new DataView(b.buffer, b.byteOffset, b.length);
  for (let off = 0; off + 0x3000 <= b.length; off += 0x1000) {
    if (b.toString('latin1', off, off + 7) !== 'CAMELOT' || b[off + 7] > 2) continue;
    let s = 0; for (let i = off + 0x10; i < off + 0x3000; i++) s += b[i];
    if ((s & 0xffff) !== v.getUint16(off + 8, true)) continue;
    for (let k = 0; k < 8; k++) {
      const c = off + 0x530 + k * 0x14c, ch = D.chars[k];
      const lv = b[c + 0xf]; const base = [v.getUint16(c + 0x10, true), v.getUint16(c + 0x12, true), v.getUint16(c + 0x18, true), v.getUint16(c + 0x1a, true), v.getUint16(c + 0x1c, true), b[c + 0x1e]];
      const cnt = [0, 0, 0, 0], dj = [0, 0, 0, 0, 0, 0];
      for (let e = 0; e < 4; e++) { const own = v.getUint32(c + 0xf8 + 4 * e, true), st = v.getUint32(c + 0x108 + 4 * e, true);
        for (let i = 0; i < 18; i++) if ((own >> i) & 1 && (st >> i) & 1) { cnt[e]++; D.djinn[e * 18 + i].s.forEach((x, j) => dj[j] += x); } }
      const eq = [];
      let item = '';
      for (let i = 0; i < 15; i++) { const lo = b[c + 0xd8 + 2 * i], hi = b[c + 0xd9 + 2 * i]; const id = lo + (hi & 1 ? 256 : 0);
        if (id && hi & 2) { if (D.items[id]) eq.push(D.items[id]); const n = ITEMS[id] && ITEMS[id].name; if (n === 'Mysterious Card') item = 'card'; if (n === "Trainer's Whip") item = 'whip'; if (n === 'Tomegathericon') item = 'tome'; } }
      const cls = G.determineClass(ch, cnt, item || null, D); const tier = D.series[cls.sid].tiers[cls.ti];
      const gear = G.gearEffects(eq);
      const pre = base.map((x, j) => x + dj[j] + gear.flat[j]);
      const fin = G.finalStats(pre, tier.mult, gear);
      const el = G.elemental(ch.aff, cls.L, gear);
      const sHP = v.getUint16(c + 0x34, true), sPP = v.getUint16(c + 0x36, true);
      const sPow = [0, 1, 2, 3].map(e => v.getUint16(c + 0x24 + 4 * e, true)), sRes = [0, 1, 2, 3].map(e => v.getUint16(c + 0x26 + 4 * e, true));
      tot++; if (fin[0] === sHP) hpOK++; if (fin[1] === sPP) ppOK++;
      if (sPow.join() === el.pow.join()) powOK++; if (sRes.join() === el.res.join()) resOK++;
      if (fin[0] !== sHP || fin[1] !== sPP || sPow.join() !== el.pow.join() || sRes.join() !== el.res.join())
        bad.push(`${f} ${ch.name} Lv${lv} ${tier.name}: HP ${fin[0]} vs ${sHP}, PP ${fin[1]} vs ${sPP}, Pow ${el.pow} vs ${sPow}, Res ${el.res} vs ${sRes}, eq ${eq.map(i=>i.n).join('/')}`);
    }
  }
}
console.log(`characters checked: ${tot} | max HP match ${hpOK} | max PP match ${ppOK} | Power match ${powOK} | Resistance match ${resOK}`);
console.log(bad.slice(0, 14).join('\n'));
