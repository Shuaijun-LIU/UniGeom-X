# Gentle grasp workcell

The second presentation page embeds an orbitable recorded 3D scene and an optional MuJoCo Wasm live scene. Both use the same physical task and controller implementation in `docs/assets/workcell/physics.js`. There is no server-side inference dependency.

The scene starts with a free 80 g object. Panda approaches, closes, lifts, experiences a 1.3 N downward half-sine load at 5.5–6.3 s, transfers and releases at the destination. Contact feedback changes grip using an ideal simulated shear/normal ratio. Fixed grip uses the same arm path and load. Outcomes are demonstrations of these scripted controllers, not UniGeom-X research benchmarks.

## Reproduce

Use Node.js 18+ for the offline Wasm recorder and Python 3 for packaging. Assets from CarryQ's licensed `web/public/franka` directory are required only to regenerate the physical asset pack; the published pack is already included.

```bash
python3 workcell/prepare.py /path/to/carryq/web
node workcell/record.mjs
node --test tests/workcell.test.mjs
python3 tests/check_site.py
```

`prepare.py` records the modified MJCF and the unchanged Panda meshes in the compressed physics pack. `record.mjs` executes both complete runs, exports a deduplicated mesh scene and body trajectories, and records simulator version, units, controller/asset hashes, contact forces, applied load, relative slip and terminal outcome. Regenerate recordings after changing the physical asset pack or controller; the tests check their hashes.

- `scene.json.gz`: static render geometry, body mapping and materials.
- `contact-feedback.json.gz`, `fixed-grip.json.gz`: complete 50 Hz state/contact records, including final outcome and joint positions.
- `physics.json.gz`: MJCF and meshes for live Wasm, loaded on demand.
- `outcomes.json`: per-demonstration outcomes; not aggregate research statistics.

The entry point is `workcell.js`; `viewer.js` handles Three.js rendering and pose interpolation. Page visibility pauses execution. Selecting another controller or changing mode resets the run. Recorded mode supports arbitrary time seeking; live mode runs causal dynamics and therefore has no seek slider. Reduced-motion preferences are respected by starting paused.

## Validation

```bash
node --test tests/workcell.test.mjs
node tests/browser.cjs http://localhost:8000/
node tests/workcell-browser.cjs http://localhost:8000/
```

Browser checks require Playwright/Chromium, use CPU software rendering, and optionally accept `CHROMIUM_PATH`. The dedicated workcell check exercises live completion, off-page pause, reset, fixed-grip failure and switching back to recorded execution.

See the bundled workcell `CREDITS.md` for licenses and measurement semantics.
