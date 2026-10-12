# Golden Sun Party Planner

Read `HANDOFF.md` first. It covers the formulas, save layouts, game modes, data sources and open work.

- Build: `python3 build.py .` → `planner.html`. Never hand-edit `planner.html`; edit `template.html`, `logic.js`, `endgame.js` or `saveparse.js` instead.
- Test after every change: `node tests/e2e.js && node tests/drag.js && node tests/gs1ui.js && node tests/ddui.js && node tests/ddgear.js && node tests/monsters.js && node tests/userimp.js`. Each should end with `errors []`. `userimp` should print 5 "match the game" lines.
- `template.html` starts with its own doctype, charset and viewport tags: GitHub Pages serves it as-is.
- Look: one fixed GBA-menu skin in the game's default window colour (sampled: #006b8c fill, grey/white/grey/black frame, black screen). Windows are the 9-slice frame images from `ui/misc/make_window.py` (`--frame`, `--frame-sel`), inlined by `build.py`. Colour/font tokens are at the top of `template.html`'s CSS; the skin is the "GBA menu skin" block at the end. No green.
- Text is the game's menu font (`ui/font/`), one size: `--fs` (20px = 2x). It is only crisp at multiples of 10px, so don't add other font sizes, letter-spacing or bold. Layout spacing is in rem/em and grows with the window. Pixel sprites only scale by whole multiples.
- Keep the page working at 400px width, and keep it self-contained: inline data, data-URI images and font, no external requests.
- Mark anything taken from an unverified source (Dark Dawn data, gear elemental bonuses) as such in the page's "How the numbers are worked out" notes.
- `planner.html` is not committed. GitHub Pages builds it from `main` via `.github/workflows/pages.yml` and serves it as `index.html`.
- Game ROMs are never committed (public repo); only data extracted from them (`monsters.json`).
- `testdata/user/` (the owner's real saves) is gitignored because the repo is public; `tests/userimp.js` needs a local copy.
