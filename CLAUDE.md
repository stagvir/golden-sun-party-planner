# Golden Sun Party Planner

Read `HANDOFF.md` first. It covers the formulas, save layouts, game modes, data sources and open work.

- Build: `python3 build.py .` → `planner.html`. Never hand-edit `planner.html`; edit `template.html`, `logic.js`, `endgame.js` or `saveparse.js` instead.
- Test after every change: `node tests/e2e.js && node tests/drag.js && node tests/gs1ui.js && node tests/ddui.js && node tests/userimp.js`. Each should end with `errors []`. `userimp` should print 5 "match the game" lines.
- Keep the page working at 400px width, and keep it self-contained: inline data and data-URI images, and no external scripts.
- Mark anything taken from an unverified source (Dark Dawn data, gear elemental bonuses) as such in the page's "How the numbers are worked out" notes.
- `planner.html` is not committed. GitHub Pages builds it from `main` via `.github/workflows/pages.yml` and serves it as `index.html`.
- `testdata/user/` (the owner's real saves) is gitignored because the repo is public; `tests/userimp.js` needs a local copy.
