const fs = require('fs'), S = require('../saveparse.js'), G = require('../logic.js'), D = require('../gsdata.json');
const b = fs.readFileSync(process.argv[2]), buf = b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
const slots = S.listSlots(buf);
for (const s of slots) {
  console.log(`\n${s.game} slot ${s.slot + 1} "${s.fileName}" ${Math.floor(s.seconds/3600)}h valid=${s.valid} party=[${s.order}] lv=${s.levels}`);
  if (!s.valid) continue;
  const r = S.readSlot(buf, s.off, s.game), v = new DataView(buf);
  r.order.forEach(k => {
    const c = r.chars[k], ch = D.chars[k];
    const cnt = [0,0,0,0], dj = [0,0,0,0,0,0];
    c.djinn.forEach(([e,i,set]) => { if (set) { cnt[e]++; D.djinn[e*18+i].s.forEach((x,j)=>dj[j]+=x); } });
    const cls = G.determineClass(ch, cnt, c.classItem || null, D), tier = D.series[cls.sid].tiers[cls.ti];
    const eq = c.equipped.map(id => D.items[id]).filter(Boolean);
    const gear = G.gearEffects(eq);
    const fin = G.finalStats(c.base.map((x,j)=>x+dj[j]+gear.flat[j]), tier.mult, gear);
    const el = G.elemental(ch.aff, cls.L, process.env.NOGEAR ? null : gear);
    const co = s.off + (s.game==='tla'?0x530:0x510) + k*0x14c;
    const sPow=[0,1,2,3].map(e=>v.getUint16(co+0x24+4*e,true)), sRes=[0,1,2,3].map(e=>v.getUint16(co+0x26+4*e,true));
    const curve = ch.curve.map(cv => G.baseStat(cv, c.level));
    console.log(` ${ch.name} Lv${c.level} cls#${c.classId.toString(16)} -> ${tier.name} djinn ${c.djinn.length} (set ${cnt}) | HP ${fin[0]}/${c.maxHP} PP ${fin[1]}/${c.maxPP} | Pow ${el.pow.join()==sPow.join()?'ok':el.pow+' vs '+sPow} Res ${el.res.join()==sRes.join()?'ok':el.res+' vs '+sRes}`);
    console.log(`   base-curve ${c.base.map((x,j)=>x-curve[j])} | gear: ${c.equipped.map(id=>(D.items[id]||{n:'?'+id}).n).join(', ')} | unknown items: ${c.inventory.filter(([id])=>!D.items[id]).length}`);
  });
}
