// Golden Sun / Golden Sun: The Lost Age save reader (GBA .sav / .srm). Runs entirely in the browser.
// Layouts follow the MIT-licensed game-tools-collection save editors by RyudoSynbios
// (github.com/RyudoSynbios/game-tools-collection), checked against their test saves.
const GSSave = (function () {
  const MAGIC = [0x43, 0x41, 0x4d, 0x45, 0x4c, 0x4f, 0x54]; // "CAMELOT"
  const CHAR_LEN = 0x14c;
  // Per-game layout. Everything inside a character record (stats, items, djinn) sits at the same offsets in both games.
  const LAYOUTS = {
    tla: { block: 0x3000, char0: 0x530, idOff: 0x14a, nChars: 8, order: 0x468 },
    gs1: { block: 0x1000, char0: 0x510, idOff: 0x128, nChars: 4, order: 0x448 },
  };
  const CLASS_ITEM_IDS = { 443: 'card', 444: 'whip', 445: 'tome' };
  const LETTERS = s => s.replace(/[^\x20-\x7e]/g, '').trim();
  const range = n => Array.from({ length: n }, (_, i) => i);

  function findBlocks(bytes) {
    const out = [];
    for (let i = 0; i + 0x1000 <= bytes.length; i++) {
      if (bytes[i] !== 0x43) continue;
      let ok = true;
      for (let j = 1; j < 7; j++) if (bytes[i + j] !== MAGIC[j]) { ok = false; break; }
      if (!ok) continue;
      out.push(i);
      i += 0xfff; // blocks sit on 0x1000 boundaries relative to each other
    }
    return out;
  }
  function checksumOk(bytes, v, off, len) {
    if (off + len > bytes.length) return false;
    let sum = 0;
    for (let i = off + 0x10; i < off + len; i++) sum += bytes[i];
    return (sum & 0xffff) === v.getUint16(off + 8, true);
  }
  // Party size: The Lost Age stores a bit per Adept who has joined; the first game stores a count (1-4).
  function partyIdx(bytes, off, L) {
    const x = bytes[off + 0x50];
    if (L.nChars === 4 && x >= 1 && x <= 4) return range(x);
    return range(8).filter(i => (x >> i) & 1);
  }

  // Returns the newest valid copy of each save slot (the game keeps backups), with the game it belongs to.
  function listSlots(buffer) {
    const bytes = new Uint8Array(buffer), v = new DataView(buffer);
    const best = {};
    for (const off of findBlocks(bytes)) {
      const slot = bytes[off + 7];
      if (slot > 2) continue;
      for (const [game, L] of Object.entries(LAYOUTS)) {
        if (!checksumOk(bytes, v, off, L.block)) continue;
        const count = v.getUint16(off + 0xa, true), key = game + slot;
        if (!best[key] || count > best[key].count) best[key] = { game, slot, off, count };
        break;
      }
    }
    const slots = Object.values(best).sort((a, b) => a.slot - b.slot);
    for (const s of slots) {
      const o = s.off, L = LAYOUTS[s.game];
      s.fileName = LETTERS(String.fromCharCode(...bytes.slice(o + 0x10, o + 0x15)));
      s.seconds = Math.floor(v.getUint32(o + 0x254, true) / 60);
      s.partySize = partyIdx(bytes, o, L).length;
      s.order = [...bytes.slice(o + L.order, o + L.order + s.partySize)];
      s.levels = range(L.nChars).map(k => bytes[o + L.char0 + k * CHAR_LEN + 0xf]);
      s.valid = range(L.nChars).every(k => bytes[o + L.char0 + k * CHAR_LEN + L.idOff] === k);
    }
    return slots;
  }

  // Reads one slot into plain data the planner can apply.
  function readSlot(buffer, off, game = 'tla') {
    const L = LAYOUTS[game];
    const bytes = new Uint8Array(buffer), v = new DataView(buffer);
    const chars = [], owned = {};
    for (let k = 0; k < L.nChars; k++) {
      const c = off + L.char0 + k * CHAR_LEN;
      const base = [v.getUint16(c + 0x10, true), v.getUint16(c + 0x12, true), v.getUint16(c + 0x18, true),
        v.getUint16(c + 0x1a, true), v.getUint16(c + 0x1c, true), bytes[c + 0x1e]];
      const djinn = []; // [element, index, isSet]
      for (let e = 0; e < 4; e++) {
        const have = v.getUint32(c + 0xf8 + 4 * e, true), set = v.getUint32(c + 0x108 + 4 * e, true);
        for (let i = 0; i < 18; i++) if ((have >> i) & 1) djinn.push([e, i, !!((set >> i) & 1)]);
      }
      const equipped = [], inventory = [];
      let classItem = '';
      for (let i = 0; i < 15; i++) {
        const lo = bytes[c + 0xd8 + 2 * i], hi = bytes[c + 0xd9 + 2 * i];
        const id = lo + (hi & 1 ? 0x100 : 0);
        if (!id) continue;
        const qty = 1 + ((hi >> 3) & 0x1f);
        inventory.push([id, qty]);
        owned[id] = (owned[id] || 0) + qty;
        if (hi & 2) { if (game === 'tla' && CLASS_ITEM_IDS[id]) classItem = CLASS_ITEM_IDS[id]; else equipped.push(id); }
      }
      chars.push({
        name: LETTERS(String.fromCharCode(...bytes.slice(c, c + 5))),
        level: bytes[c + 0xf], classId: bytes[c + 0x129], base, djinn, equipped, classItem, inventory,
        maxHP: v.getUint16(c + 0x34, true), maxPP: v.getUint16(c + 0x36, true),
      });
    }
    const joined = partyIdx(bytes, off, L);
    const order = [...bytes.slice(off + L.order, off + L.order + joined.length)].filter(k => k < L.nChars);
    return { game, chars, owned, order, joined };
  }

  return { listSlots, readSlot, LAYOUTS };
})();
if (typeof module !== 'undefined') module.exports = GSSave;
