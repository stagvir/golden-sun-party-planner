// Golden Sun: TLA class/stat logic. Element ids: V=0, Me=1, Ma=2, J=3.
const GSLogic = (function () {
  const SYM = [2, 3, 0, 1];
  const ITEM_SERIES = { card: 22, whip: 23, tome: 24 };
  // dual series keyed by primary,secondary
  const DUAL = { '0,1': 4, '2,1': 5, '0,3': 7, '2,3': 8, '1,0': 10, '3,0': 11, '1,2': 13, '3,2': 14,
    '0,2': 16, '2,0': 16, '1,3': 18, '3,1': 18 };
  // tri series keyed by sorted element set
  const TRI = { '0,1,2': [6], '0,2,3': [9, 17], '0,1,3': [12, 19], '1,2,3': [15] };
  // Growth-curve anchor levels. Checked against 248 characters in real saves from both games:
  // reading the six points as levels 0..100 centres the residual (level-up luck) on zero.
  const CHECK = [0, 20, 40, 60, 80, 100];

  function levels(el, counts) {
    const L = counts.slice();
    L[el] += 5;
    return L;
  }
  function meets(L, req) { return req.every((r, i) => L[i] >= r); }
  const sum = a => a.reduce((x, y) => x + y, 0);

  function bestTier(seriesList, L, data) {
    let best = null;
    for (const sid of seriesList) {
      const s = data.series[sid];
      s.tiers.forEach((t, ti) => {
        if (meets(L, t.req)) {
          const sc = sum(t.req);
          if (!best || sc > best.score) best = { sid, ti, score: sc };
        }
      });
    }
    return best;
  }

  // counts: Set djinn per element. item: 'card'|'whip'|'tome'|null
  function determineClass(ch, counts, item, data) {
    const el = ch.el;
    const L = levels(el, counts);
    if (item) {
      const sid = ITEM_SERIES[item];
      const b = bestTier([sid], L, data) || { sid, ti: 0 };
      return { sid: b.sid, ti: b.ti, L, kind: 'item', certain: true };
    }
    // primary element: highest level; ties go to the adept's own element
    let P = el;
    for (let e = 0; e < 4; e++) if (L[e] > L[P]) P = e;
    const present = [0, 1, 2, 3].filter(e => L[e] > 0);
    let cands = null, kind;
    if (present.length === 1) { cands = [ch.mono]; kind = 'mono'; }
    else if (present.length === 2) {
      const S = present.find(e => e !== P);
      cands = [DUAL[P + ',' + S]]; kind = 'dual';
    } else if (present.length === 3) {
      const key = present.slice().sort().join(',');
      if (present.includes(SYM[P])) { cands = TRI[key]; kind = 'tri'; }
    }
    let b = cands ? bestTier(cands, L, data) : null;
    if (b) return { sid: b.sid, ti: b.ti, L, kind, certain: true };
    // Fallback (game behaviour not verified): best eligible class among this primary's families
    const fam = [];
    if (P === el) fam.push(ch.mono);
    for (let s = 0; s < 4; s++) if (s !== P && DUAL[P + ',' + s] !== undefined) fam.push(DUAL[P + ',' + s]);
    for (const k in TRI) { const set = k.split(',').map(Number); if (set.includes(P) && set.includes(SYM[P])) fam.push(...TRI[k]); }
    b = bestTier(fam, L, data) || { sid: ch.mono, ti: 0 };
    return { sid: b.sid, ti: b.ti, L, kind: 'fallback', certain: false };
  }

  // Dark Dawn: each Adept has its own list of class lines, with requirements given as Set djinn per element
  // (Golden Sun Syndicate tables). The game's exact rule isn't published; this applies the same idea as the
  // GBA games: lines must use exactly the elements present, a two-element line must lead with the element
  // that has the highest elemental level (ties go to the Adept's own), and the highest tier met wins.
  function determineClassDD(ch, counts, data) {
    const el = ch.el, L = levels(el, counts);
    let P = el;
    for (let e = 0; e < 4; e++) if (L[e] > L[P]) P = e;
    const present = new Set([el, ...[0, 1, 2, 3].filter(e => counts[e] > 0)]);
    const elemsOf = s => { const x = new Set([el]); data.series[s].tiers.forEach(t => t.req.forEach((v, e) => { if (v > 0) x.add(e); })); return x; };
    const same = (a, b) => a.size === b.size && [...a].every(v => b.has(v));
    // A line's lead element, read from its first tier. A tie there means the line belongs to another element
    // (e.g. Rief's Guardian tier of the Venus Swordsman line), so ties go to the other element.
    const leadOf = s => { const r = data.series[s].tiers[0].req, l = levels(el, r); let p = el; for (let e = 0; e < 4; e++) if (e !== el && l[e] >= l[p]) p = e; return p; };
    const best = list => {
      let b = null;
      for (const sid of list) data.series[sid].tiers.forEach((t, ti) => {
        if (t.req.every((r, e) => counts[e] >= r)) { const sc = sum(t.req); if (!b || sc > b.score) b = { sid, ti, score: sc }; }
      });
      return b;
    };
    const cands = ch.lines.filter(s => same(elemsOf(s), present));
    let kind = present.size === 1 ? 'mono' : present.size === 2 ? 'dual' : 'tri';
    let b = null;
    if (present.size === 2) b = best(cands.filter(s => leadOf(s) === P)) || best(cands);
    else if (present.size <= 3) b = best(cands);
    if (b) return { sid: b.sid, ti: b.ti, L, kind, certain: true };
    b = best(ch.lines.filter(s => [...elemsOf(s)].every(e => present.has(e)))) || { sid: ch.mono, ti: 0 };
    return { sid: b.sid, ti: b.ti, L, kind: 'fallback', certain: false };
  }

  function baseStat(curve, lv) {
    if (lv <= 1) return curve[0];
    for (let i = 0; i < 5; i++) {
      const a = CHECK[i], b = CHECK[i + 1];
      if (lv <= b) return Math.floor(curve[i] + (curve[i + 1] - curve[i]) * (lv - a) / (b - a));
    }
    return curve[5];
  }

  // Equipment effect codes (from the item table; meanings checked against wiki item pages)
  //  1 max HP +, 2 HP regen, 3 max PP +, 4 PP regen, 5 Agility +, 6 Luck +,
  //  9 PP x(v/10), 13 Agility x(v/10), 14 Luck x(v/10),
  //  15-18 Power V/Me/Ma/J, 19-22 Resistance V/Me/Ma/J, 23 unleash rate +%, 25 removes curse effects, 27 more encounters
  const FLAT = { 1: 0, 3: 1, 5: 4, 6: 5 };
  const MULT = { 9: 1, 13: 4, 14: 5 };
  function gearEffects(items) {
    const g = { flat: [0, 0, 0, 0, 0, 0], mult: [1, 1, 1, 1, 1, 1], pow: [0, 0, 0, 0], res: [0, 0, 0, 0],
      hpRegen: 0, ppRegen: 0, unleashBonus: 0, cursed: [], curseFix: false, encounters: false, other: [] };
    for (const it of items) {
      if (!it) continue;
      g.flat[2] += it.a || 0;
      g.flat[3] += it.d || 0;
      if (it.c) g.cursed.push(it.n);
      for (const [t, v] of (it.e || [])) {
        if (t in FLAT) g.flat[FLAT[t]] += v;
        else if (t in MULT) g.mult[MULT[t]] *= v / 10;
        else if (t >= 15 && t <= 18) g.pow[t - 15] += v;
        else if (t >= 19 && t <= 22) g.res[t - 19] += v;
        else if (t === 2) g.hpRegen += v;
        else if (t === 4) g.ppRegen += v;
        else if (t === 23) g.unleashBonus += v;
        else if (t === 25) g.curseFix = true;
        else if (t === 27) g.encounters = true;
        else g.other.push([t, v]);
      }
    }
    return g;
  }

  // Elemental Power = 75 + affinity + 5 x elemental level + gear; Resistance uses a base 10 higher (85).
  // Affinity comes from the character table (own 4, neutral 3, opposed 2, symbiotic 1); this gives the wiki's 104/78/77/76.
  // Both checked against the values stored in real save files (Power matched 80/80, Resistance = Power + 10 in every case).
  function elemental(aff, L, gear) {
    const cap = v => Math.max(0, Math.min(200, v));
    const base = [0, 1, 2, 3].map(e => 75 + aff[e] + 5 * L[e]);
    return { pow: base.map((b, e) => cap(b + (gear ? gear.pow[e] : 0))), res: base.map((b, e) => cap(b + 10 + (gear ? gear.res[e] : 0))) };
  }

  // Final stats: (base + djinn + boost items + modifiers + flat gear) x class %, then gear multipliers.
  function finalStats(pre, classMult, gear) {
    return pre.map((p, k) => Math.max(0, Math.floor(Math.floor(p * classMult[k] / 100) * (gear ? gear.mult[k] : 1))));
  }

  return { determineClass, determineClassDD, baseStat, levels, gearEffects, elemental, finalStats, ITEM_SERIES };
})();
if (typeof module !== 'undefined') module.exports = GSLogic;
