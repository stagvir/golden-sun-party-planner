# golden-sun-party-planner
Party planning tool for the Golden Sun games (The Broken Seal, The Lost Age, Dark Dawn).

Live: https://stagvir.github.io/golden-sun-party-planner/

- Build: `python3 build.py .` → `planner.html` (self-contained). Never hand-edit `planner.html`.
- Deploy: every push to `main` runs `.github/workflows/pages.yml`, which builds and publishes `planner.html` as `index.html`.
- Details: see `HANDOFF.md` and `CLAUDE.md`.
