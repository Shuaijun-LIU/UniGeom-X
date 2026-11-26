# Grasp, recover, turn and seat

The second slide offers recorded 3D playback and live MuJoCo physics for the same
20-second scripted manipulation task. A Panda grasps a free object, experiences a
downward load, clears a divider, turns 90 degrees during transfer, experiences a
sideways load and lowers the object into a physical receiving pocket.

The compact workbench has four legs and a rubber mat. All new surface textures
are generated locally. Recorded poses and ideal pad loads share one clock.
The sensor panels render an uncalibrated GelSight-inspired optical approximation;
the controller uses the underlying ideal forces, not an optical estimator.

To rebuild from the licensed CarryQ web checkout:

```sh
python3 workcell/prepare.py /path/to/carryq/web
node workcell/record.mjs
node --test tests/workcell.test.mjs
python3 tests/check_site.py
```

`physics.js` is shared by the recorder and browser runtime. After changing it or
the scene, regenerate both recordings; tests verify their source and asset hashes.
Success requires final position, height, uprightness and orientation within the
pocket. It is not inferred from elapsed time. The contact-feedback and fixed-grip
runs use identical geometry, starting state, motion targets and load pulses.
This is an interactive task prototype, not a trained UniGeom-X evaluation.

Licenses and visual references: `docs/assets/workcell/CREDITS.md`.
