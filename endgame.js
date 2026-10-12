// Endgame filter: hand-picked per slot from each item's full stats and effects.
// Shared by the page (pasted in at build time) and the test scripts.
const ENDGAME = {
  only: {
    // Weapons: top Attack plus the strongest unleashes, kept per weapon type so every Adept has options.
    w: [
      // Long swords (Isaac, Garet, Felix, Piers)
      'Sol Blade', 'Excalibur', 'Darksword', 'Fire Brand', 'Levatine', 'Rune Blade', 'Mythril Blade',
      'Gaia Blade',          // lower Attack, but Titan Blade is one of the strongest unleashes and adds Venus Power/Resist
      // Light blades (adds Ivan and Jenna)
      'Tisiphone Edge', 'Masamune', 'Burning Sword', 'Phaeton\'s Blade',
      'Kikuichimonji',       // Asura unleash outhits several higher-Attack blades
      // Axes
      'Stellar Axe', 'Gaia\'s Axe', 'Apollo\'s Axe',
      // Maces (adds Mia and Sheba)
      'Tungsten Mace', 'Rising Mace', 'Wicked Mace',
      // Staves (Ivan, Mia, Jenna, Sheba)
      'Lachesis\' Rule', 'Atropos\' Rod', 'Clotho\'s Distaff', 'Nebula Wand', 'Salamander Rod',
    ],
    // Body
    b: [
      'Valkyrie Mail',       // best armor Defense plus 20% unleash rate
      'Xylion Armor', 'Chronos Mail', 'Dragon Scales', 'Asura\'s Armor', 'Demon Mail',
      'Mythril Clothes',     // anyone can wear it: Def 49 and 15% unleash rate
      'Triton\'s Ward', 'Erinyes Tunic', 'Storm Gear',
      'Wild Coat',           // Agility +40
      'Mysterious Robe', 'Iris Robe', 'Aeolian Cassock', 'Feathered Robe', 'Ardagh Robe', 'Oracle\'s Robe',
    ],
    // Arm
    a: [
      'Riot Gloves',         // Attack +15 and 20% unleash rate
      'Big Bang Gloves', 'Titan Gloves', 'Aerial Gloves', 'Spirit Gloves',
      'Mythril Armlet', 'Jester\'s Armlet', 'Leda\'s Bracelet', 'Clear Bracelet',
      'Cosmos Shield', 'Aegis Shield', 'Flame Shield',
    ],
    // Head
    h: [
      'Gloria Helm', 'Millenium Helm', 'Mythril Helm', 'Minerva Helm', 'Dragon Helm',
      'Warrior\'s Helm',     // lower Defense, but 10% unleash rate and Venus Power
      'Adept\'s Helm',       // PP x1.2
      'Fear Helm',
      'Berserker Band', 'Psychic Circlet', 'Demon Circlet',
      'Crown of Glory', 'Lucky Cap',
      'Alastor\'s Hood',     // Def 47 and anyone can wear it
    ],
    s: ['Mythril Shirt', 'Golden Shirt'],
    // Boots: Defense is tiny on every pair, so effects decide
    f: [
      'Hyper Boots', 'Ninja Sandals', // +12% / +15% unleash rate
      'Golden Boots',                 // Agility +30
      'Dragon Boots',                 // resist Venus/Mercury/Mars
    ],
    // Rings: judged by their battle use
    r: ['Soul Ring', 'Spirit Ring', 'Golden Ring', 'War Ring', 'Cleric\'s Ring', 'Guardian Ring'],
  },
  include: [],         // always keep these
  exclude: [],         // always drop these
};
// Golden Sun (first game): its strongest gear per slot. No Sol Blade (an unused beta item there).
const ENDGAME_GS1 = {
  only: {
    w: [
      'Gaia Blade', 'Muramasa', 'Silver Blade',                 // long swords
      'Kikuichimonji', 'Swift Sword', 'Assassin Blade',         // light blades (Ivan can use these)
      'Demon Axe', 'Giant Axe', 'Dragon Axe',                   // axes
      'Wicked Mace', 'Blessed Mace', 'Righteous Mace',          // maces
      'Crystal Rod', 'Zodiac Wand', 'Angelic Ankh', 'Demonic Staff', // staves (Ivan, Mia)
    ],
    b: ['Demon Mail', 'Asura\'s Armor', 'Dragon Scales', 'Spirit Armor', 'Storm Gear', 'Ninja Garb', 'Elven Shirt',
      'Mysterious Robe', 'Feathered Robe', 'Oracle\'s Robe'],
    a: ['Mirrored Shield', 'Earth Shield', 'Dragon Shield', 'Aura Gloves', 'Spirit Gloves', 'War Gloves', 'Spirit Armlet', 'Virtuous Armlet'],
    h: ['Thunder Crown', 'Warrior\'s Helm', 'Knight\'s Helm', 'Adept\'s Helm', 'Jeweled Crown', 'Lucky Cap', 'Ninja Hood', 'Mythril Circlet'],
    s: ['Mythril Shirt'],
    f: ['Hyper Boots', 'Quick Boots'],
    r: ['Adept Ring', 'War Ring', 'Cleric\'s Ring', 'Fairy Ring'],
  },
  include: [],
  exclude: [],
};
function endgameSet(items, cfg) {
  const keep = new Set();
  for (const [id, it] of Object.entries(items)) {
    const list = cfg.only[it.sl];
    if ((list && list.includes(it.n)) || cfg.include.includes(it.n)) keep.add(+id);
    if (cfg.exclude.includes(it.n)) keep.delete(+id);
  }
  return keep;
}
if (typeof module !== 'undefined') module.exports = { ENDGAME, ENDGAME_GS1, endgameSet };
