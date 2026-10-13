# Golden Sun Party Planner — handoff

A single-file HTML planner for **Golden Sun (The Broken Seal)**, **The Lost Age** and **Dark Dawn**.

What it does:
- Party order, levels, djinn per Adept, and the resulting class.
- Psynergy, final stats and elemental Power/Resistance.
- Gear in every slot with stat differences, plus a curated endgame filter.
- `.sav` import for both GBA games.
- Live copy: https://claude.ai/artifact/HKT9K8TTmaStUzjqD8tiLG (private to the owner).

## Quick start

```bash
npm install                     # playwright + jsdom (tests only; the planner itself has no build deps)
python3 build.py .              # template.html + data + js  ->  planner.html (self-contained, ~500 KB)
node tests/e2e.js               # pass `$(npm root -g)` as the argument if playwright is installed globally
```

Open `planner.html` in a browser. Everything is inlined: data, icons and the window frame as data URIs, the Golden Sun menu font (`ui/font/gsfont.woff2`) and scripts. The page makes no external requests.

## Files

| File | Role |
|---|---|
| `template.html` | All UI: markup, CSS, and the main script (one IIFE). Placeholders `__DATA__`, `__DDDATA__`, `__ICONS__`, `__UI__`, `__ICON_ALIASES__`, `__LOGIC__`, `__ENDGAME__`, `__SAVEPARSE__` are filled by `build.py`. |
| `logic.js` | `GSLogic`. Contains `determineClass` (GBA), `determineClassDD`, `baseStat` (growth curves), `gearEffects`, `elemental`, `finalStats`. Shared by the page and the tests. |
| `endgame.js` | Hand-picked endgame gear lists: `ENDGAME` (TLA) and `ENDGAME_GS1`. |
| `saveparse.js` | `GSSave.listSlots` / `readSlot`. Auto-detects the GS1 or TLA layout. |
| `build.py` | Builds `planner.html`. Embeds only the icons that match item names. Writes `icon_report.json`. |
| `extract.py` | Regenerates `gsdata.json` from the Archipelago GS:TLA data dir (see Data sources). |
| `gsdata.json` | GBA data: `chars`, `series` (classes), `abil` (Psynergy), `djinn`, `items`, `boost` (stat items). |
| `dddata.json` | Dark Dawn data, built by `dd/build_dd.py`. Same shape plus `lines`/`mono` per character. `items` is empty. |
| `dd/` | Raw Dark Dawn tables (`<name>.txt`, `djinn.txt`), `parse.py` (→ `ddclasses.json`), `build_dd.py` (→ `dddata.json`), the two DD icon sheets the user supplied (named by `name_icon_sheets.py`) and the DD mugshot sheet (`cut_portraits.py`). |
| `icons/gba/` | Item icons named like wiki files (`Warriors_Helm.gif`). `icon_aliases.json` maps the odd names. |
| `icons/dd/`, `ui/psynergy_dd/` | Dark Dawn item (192) and Psynergy (179) sprites at native 24×24 with transparent backgrounds, cut from the two `dd/icon_sheets/` sheets and named by `dd/name_icon_sheets.py`, which matches each sprite against the named, framed icons in the Golden Sun Realm guide PDFs (report: `dd/name_icon_sheets.json`). 80 item and 10 Psynergy sprites on the sheets aren't in the guides and stay unnamed. DD has two Rusty Swords: `Rusty_Sword_DD` (→ Rune Blade) and `Rusty_Sword_2_DD` (→ Kikuichimonji). Shown at native 24 px. In Dark Dawn the showcase and each Adept's Psynergy list use these sprites (`psyIcon()` in template.html) (`GSUI.psyDD`; `build.py` maps the planner's Healing Gust / Toxic Grit to the guide's Healthy Gust / Toxic Gift) and falls back to the GBA icon for Avoid, Death Leap and Heat Wave, which have no DD sprite. |
| `ui/` | Portraits, element stars, frame and Psynergy icons for the game-styled showcase. `ui/font/`: the game's menu font built from the user's glyph sprites by `build_font.py` (needs fontTools; the built `gsfont.woff2` is committed). `ui/misc/make_window.py`: the window frame images. Dark Dawn portraits are `ui/portraits/<Name>_DD.gif`, cut from `dd/icon_sheets/dd_mugshots.png` by `dd/cut_portraits.py`. |
| `tests/` | Playwright UI tests and node data checks (below). |
| `testdata/gtc/` | Test saves from game-tools-collection (MIT, licence included). |
| `testdata/user/` | The owner's real GS1 and TLA saves (3 + 2 slots). |

Rebuild Dark Dawn data with `cd dd && python3 parse.py && python3 build_dd.py . ../gsdata.json && mv dddata.json ..`. Re-parse items first if the guides change: `python3 dd/parse_items.py <weapon.pdf> <armor.pdf>`.

## Monsters (`monsters.json`, Monsters tab)

- Extracted from the owner's US ROMs (never committed) by `monsters/extract_monsters.py <TLA.gba> <GS1.gba>`; the script's docstring has every offset.
- Enemy records: TLA 76 bytes, id *n* at `0xB9E3F + 76n` (ids 1-379); GS1 84 bytes, id *n* at `0x80ED7 + 84n` (ids 0-163). Elemental tables: TLA `0xC6684`, GS1 `0x88E38` (24 bytes: element, levels, Power/Resistance pairs).
- Names come from the game text, decoded by `monsters/gstext.py` (Camelot's per-previous-character Huffman scheme): enemies at line 1067/655 + id, abilities 1447/819 + id, items 607/386 + id.
- Checks: all 377 Archipelago TLA entries match field for field (names except two hyphens Archipelago drops); wiki spot checks (Phoenix, Anger Ball, Living Armor, ...); GS1 record 0 is the same "???" placeholder as TLA's, and its names line up with stats ("Mystery Man" = the lv 10, 3000 HP opening fight).
- Drop code *n* = 1/2^(n-1) (code 9 = 1/256, the wiki's figure for the Tisiphone Edge).
- 100 TLA records are identical to GS1 ones (likely carried over and unused); the tab marks them and can hide them. The encounter/formation tables aren't found yet; they would settle this and give real enemy parties for the damage simulator.
- The tab shows one card per name (TLA 235, GS1 128). Records with the same name that differ in any field (the 12 Mercury Djinni, Saturos's two fights, ...) are versions in a dropdown on the card, ordered by level then HP; exact duplicates are dropped. Narrow cards (under 340px, via a container query) put stats and elements in two columns.
- Sprites: `ui/monsters/`, matched by name in `ui/monsters/sprites.json`; `build.py` inlines them (it reads GIF sizes itself: the Pages runner has no Pillow). 191 are the owner's battle sprites (mostly animated GIFs). Saturos/Menardi/Agatio/Karst use their `_Front` pose, Mystery Man/Woman use Saturos/Menardi, "Grisly" uses Grizzly.gif. A `tla:`/`gs1:` key gives one game its own picture where both games share a name: `tla:Kobold` and `tla:Lich` are the zip's `_2` files, which match the Lost Age ROM.
- The other 45 (colour swaps like Sea Hedgehog and Gillman Lord, bosses like Dullahan and Valukar, and Wyvern/Sky Dragon, whose zip GIFs were a back view) are made from the owner's Lost Age ROM by `monsters/extract_sprites.py <TLA.gba>`. Its docstring has every table: battle unit table 0x130D0C (enemy n = unit n + 7: sprite id, colour variant), sprite records 0x300000, sprite → sheet 0x2E91C, resource directory 0x680000, the packer's LZ, zero-skip frames, colour remap tables 0x203A8, system palette 0x17B10. Found by reading the battle code (0x081280BC/0x081280D8 → loader 0x080227E0); the formats follow the descriptions in the Alchemy decompilation (github.com/PascalPixel/alchemy). Check: for 270 of the 272 Lost Age entries that already had a GIF, the tables pick the same sheet and colours (the two misses were the Kobold/Lich mix-up). Animation is front frames 0, 2, 4, 2 at 350 ms, as the existing GIFs play; the game's own animation scripts aren't read. Every monster in both games now has a picture.

## Model and formulas (GBA, verified)

- **Class.**
  - Elemental level = 5 for the Adept's own element, plus 1 per Set djinni.
  - The leading element is the highest level; ties go to the Adept's own element.
  - Series type is mono, dual or tri; tri needs the symbiotic element.
  - The highest tier whose requirements are met wins.
  - Class items (Card, Whip, Tome) force series 22, 23 and 24.
  - This matches every save checked, including the class-item classes.
- **Base stats.**
  - Six curve points per stat, read at levels **0, 20, 40, 60, 80, 100**, with linear interpolation.
  - Against 248 save Adepts this centres the residual on 0. Most of them are only at Lv 1–33, so high levels are less tested.
  - Per-Adept "corrections" (`mods`) hold the level-up luck. A save import fills them in.
- **Final stat.**
  - `floor(floor((base + djinn + stat items + flat gear + mods) × class% / 100) × gear multiplier)`.
  - Gear multipliers are effect codes 9 (PP), 13 (AGL) and 14 (LCK); the value is /10.
- **Elemental.**
  - Power = 75 + affinity (own 4, neutral 3, opposed 2, symbiotic 1) + 5×level, capped at 200. Resistance uses a base 10 higher.
  - Saves store these **without gear**; that part matches 100% of save Adepts.
  - Gear Power/Resist bonuses (codes 15–22) are added on top here, but that addition can't be checked from saves.
- **Item effect codes:**
  - 1 HP, 2 HP regen, 3 PP, 4 PP regen, 5 AGL, 6 LCK
  - 23 unleash %, 25 uncurse, 27 lure
  - The equip bitmask is indexed by character. Character index: Isaac 0, Garet 1, Ivan 2, Mia 3, Felix 4, Jenna 5, Sheba 6, Piers 7. Element index: V 0, Me 1, Ma 2, J 3. Djinn index: `e*18 + i`.

## Save layouts (`saveparse.js`)

| | TLA | GS1 |
|---|---|---|
| Block / checksum span | 0x3000 / bytes 0x10..0x3000, uint16 sum at +8 | 0x1000 / 0x10..0x1000 |
| First character / stride | 0x530 / 0x14c | 0x510 / 0x14c |
| Char id (validity) | +0x14a | +0x128 |
| Party | bitmask at 0x50, order at 0x468 | **count** (1–4) at 0x50, order at 0x448 |

**Shared fields:**
- Every block starts with "CAMELOT". The slot number is at +7 (slots >2 are backups or other data). The save count is at +0xa; the newest copy wins.
- Character record:
  - +0xf level
  - +0x10 HP, +0x12 PP, +0x18 ATK, +0x1a DEF, +0x1c AGL, +0x1e LCK (base stats)
  - +0x24+4e Power, +0x26+4e Resist
  - +0x34 max HP, +0x36 max PP
  - +0xd8 items: 15×2 bytes; hi-byte bit 0 = id bit 8, bit 1 = equipped, bits 3–7 = qty−1
  - +0xf8+4e djinn owned, +0x108+4e djinn Set
  - +0x129 class id. Ids ≥0xc8 are story-only classes, such as GS1's opening "?" class.
- Item ids 443/444/445 are the TLA class items. GS1 ids 0xc8–0xcf are Psynergy items and are ignored.

## Game modes (`GAMES` in template.html)

**Per-game state.** Each game keeps its own state in localStorage:
- TLA: `tla-planner-v1`
- others: `gs-planner-<game>-v1`
- current game: `gs-planner-game`

`switchGame()` saves one game's state and loads the other's. `D` is rebound per game (`dataFor(g)`).

**Common shape:** `state.order` is always 8 long with the game's characters first. `ORDER()` is the visible slice. `state.dj` is always 72 long, and djinn outside the game are forced unassigned.

### The Broken Seal (`gs1`)
- 4 Adepts, 28 djinn (index `i < 7` per element), cap of 7 per Adept. The user's saves all show 7.
- Items come from `GS1_ITEMS`: the gtc GS1 groups, minus Sol Blade (an unused beta item in GS1 with different stats), Masamune and Kusanagi.
- Uses TLA stats for shared items; spot-checked (e.g. Kikuichimonji identical).
- The Medium line is renamed Medium / Dark Mage / Death Mage.
- No class items.

### Dark Dawn (`dd`) — core only
- **Classes.** Lines, tiers, djinn requirements (as Set-djinn counts), class % and Psynergy by level come per Adept from the Golden Sun Syndicate DD class guide (`goldensun-syndicate.net/dd/classes/character/<name>/`).
  - These were read through a summarising fetcher. Spot checks matched (Glare and Tinder bonuses match GameFAQs), but a dropped row is possible.
  - Two rows look odd but are confirmed as the page's content: Amiti's Medium line has no Conjurer tier, and Himi has no Samurai line.
- **Djinn.** The 72 djinn and their stat bonuses come from the Syndicate DD djinn guide.
- **`determineClassDD` rule.** It mirrors the GBA rule:
  - candidate lines must use exactly the present elements;
  - for two-element mixes, the line's lead element must equal the Adept's leading element (from tier 0; ties in a line's own tier 0 go to the non-own element);
  - for three elements, the highest scoring tier wins.
  - Every listed tier is reachable except Rief's and Amiti's Guardian and Luminier tiers. Those are unreachable by the same logic in TLA, where Druid and Water Monk win the tie.
  - The rule agrees with TLA's picks for the four analogous Adepts in 98.4% of djinn mixes; the rest are DD-specific requirement differences.
- **Psynergy restrictions.** "X or higher" / "transforms after X" are treated as **inclusive of tier X**; the TLA tables confirm this. Psynergy figures are borrowed from TLA by name; 21 DD-only spells have none.
- **Base stats are entered by hand** because DD growth curves aren't published.
  - The Modifiers tab has a "From the status screen (gear removed)" helper. It solves the smallest base that reproduces each shown stat under the current class and djinn.
  - Level only changes which Psynergy is learned.
- **Gear** (`dd/dditems.json` → `dddata.json` items, built by `dd/build_dd.py`):
  - 188 weapons and armor parsed from Golden Sun Realm's DD weapon and armor guides (PDFs, not committed) by `dd/parse_items.py`. Power/Resist elements are read from the coloured ball beside each line and cross-checked against the item description.
  - DD-only item fields: `ul` (unleash names, no rates), `note` (the type line's description), `fx` (worded effects), `price`, `where`, `mq` (characters whose right to equip is unconfirmed).
  - Who can equip: per item type from the Golden Sun wiki character infoboxes (`dd/ddequip.json`). Amiti can't use ankhs. Boots and rings are assumed open to everyone.
  - Slots are per game (`GAMES.<g>.slots`): DD has a Face slot (goggles) and no Shirt slot.
  - Equipping uses the GBA formula (gear added before class %), which is unverified for DD.
- **Hidden in DD:** the endgame filter, Power/Resistance, unleash rates and stat items.

## Tests

The Playwright tests take an optional playwright root as their argument:
- `tests/e2e.js` — main TLA flows: djinn picker, swaps, standby, Modifiers typing, baseline revert, gear, import, 400px width.
- `tests/drag.js` — column drag and keyboard reorder in the Djinn, Gear and Modifiers tabs.
- `tests/gs1ui.js` — Broken Seal mode, game switching, GS1 and TLA import auto-switch.
- `tests/ddui.js` — Dark Dawn mode, class picks, base-stat solver. Writes screenshots to `out/`.
- `tests/monsters.js` — Monsters tab: card counts per game, the version dropdown, search, sort, the copies filter, every card has a sprite, Kobold differs per game, hidden in Dark Dawn, 400px width (page and each card).
- `tests/ddgear.js` — Dark Dawn gear: slots, who can equip, unconfirmed flags, unleashes, 400px width, GBA slots unchanged.
- `tests/userimp.js` — imports the owner's saves. Expect 5 "match the game" lines (23/23 Adepts' HP/PP).

Node checks:
- `tests/usercheck.js <sav>` — per-slot HP/PP/Power/Resist comparison. Run with `NOGEAR=1` to compare elemental values without gear.
- `tests/curvecheck.js` — growth-curve anchor test.
- `tests/gs1check.js`, `tests/savecheck.js` — older checks. They need `archipelago-data/items.json` (see below).

## Data sources

- **GBA tables:** github.com/cjmang/Archipelago `worlds/gstla/data` (commit c83307716a88).
  - Run `python3 -I extract.py <that dir> gsdata.json`.
  - For the older checks, copy `items.json` to `./archipelago-data/`.
- **Save layouts and test saves:** github.com/RyudoSynbios/game-tools-collection (MIT, commit 6f5d8064050e).
  - Files: `src/lib/templates/golden-sun*/saveEditor/template.ts`.
- **Wiki:** goldensunwiki.net, for icons, mechanics and spot checks. Raw wikitext (`?action=raw`) is robots-blocked for fetchers.
- **Dark Dawn:** goldensun-syndicate.net/dd/classes/ and /dd/djinn/. Icons: Golden Sun Realm guide PDFs (goldensunrealm.com/gsdd/weapons.php etc.).
- **Sprites:** GBA item, portrait and Psynergy sprites from the user's zip (fan-wiki sprites). Dark Dawn mugshots from a user-supplied sheet ("Protagonists' Mugshots", DS rip). Keep the page private.

## Open work, in rough priority

1. **Dark Dawn gear gaps.**
   - Confirm the "may not be equippable" cases (`dd/ddequip.json` `unsure`): which staffs Karis can use, which robes and headgear Sveta can use, Amiti's crowns, goggles for anyone. Also whether goggles really have their own Face slot.
   - Unleash rates/power and the worded effects ("More critical hits", "Boosts Earth Power") have no figures.
   - Gear Power/Resist bonuses wait on item 2.
2. **Dark Dawn elemental Power/Resistance and growth curves.**
   - Unpublished. Options: decode DD `.sav` files (would also give an importer and curve fitting) or extract from the user's own ROM.
3. **Phase 3: damage estimates** (the original goal).
   - Generic target sliders first, then an enemy picker (`enemies.json` in the Archipelago data).
   - Psynergy: base × (1 + (Pow − Res)/200).
   - Physical and unleash: ATK-vs-DEF with the /400 elemental factor.
   - Unleash secondary-effect codes aren't mapped yet.
4. **Minor gaps.**
   - GS1 item stats are assumed equal to TLA beyond the spot checks.
   - The GS1 7-djinn cap isn't sourced, only consistent with the saves.
   - Growth curves are less tested above Lv 33.
