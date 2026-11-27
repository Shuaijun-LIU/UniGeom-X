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

## Two objects

The object selector preserves the original slippery block and adds a soft sponge.
Feedback and fixed-grip runs appear side by side on desktop, with a shared clock,
play/pause, seek and explicit reset. Both recorded 3D and live physics support the
comparison. Narrow screens stack the two panels. Camera orbit and zoom are linked.
The soft task uses the same 20-second approach, lift, load, divider crossing,
turn, transfer and release sequence, with a wider shallow tray.

The sponge is a **reduced elastic contact model**, not a calibrated continuum
foam simulation. Eight 1 g box-shaped contact nodes are connected to a freely moving 20 g
carrier by damped translational springs (X/Y/Z: 200/80/200 N/m, damping
0.15 N·s/m). Its surface corners follow those physical nodes. There is no weld,
scripted attachment, or time-driven scale animation. The 1 ms physics step,
recorded body poses, deformation and ideal contact forces share one clock.
The feedback controller starts at a 3.2 N gripper command and relaxes it when
compression exceeds 18%; it can increase force when the shear/normal ratio rises after lift-off.
The comparison holds a fixed 8 N command. Both runs use identical starts and
0.12 N downward / 0.10 N sideways load pulses.

The soft readouts show current and maximum opposite-face compression. A 35%
limit is a demonstration criterion, **not a damage threshold**. Both controllers
place the sponge; feedback peaks at about 24.1%, while the firm grip peaks at
58.7%. Both recover after release. These are scripted prototype outcomes, not
UniGeom-X trained-policy results. The tactile panels remain uncalibrated optical
illustrations; the soft panel uses the actual contact-node locations and loads.

Regenerate and validate the additional task:

```sh
python3 workcell/prepare.py /path/to/carryq/web
node workcell/record-soft.mjs
node --test tests/workcell.test.mjs tests/soft-workcell.test.mjs
# With Playwright and Chromium installed:
node tests/soft-workcell-browser.cjs http://localhost:8000/
```

The two tasks share Panda meshes and the MuJoCo runtime. Soft scene XML and
recordings are separate, so adding the sponge does not alter the rigid records.

## Contact and playback fixes

The soft surface corners now match box contact proxies. Adjacent finger and hand
collision geometry is enabled, and stiff contact settings keep the worst sampled
visible surface/pad overlap below 0.25 mm (about 0.13 mm in the fixed-grip run).
Grip closure ramps in over 0.3 s. Compression feedback remains active during
closure; shear-based increases begin after lift-off so closing contacts are not
misread as slip.

Rigid load pulses act only while the object is held. After grip loss, gravity and
ordinary contact remain active, but later scripted loads cannot move the fallen
block. The terminal pose remains visible until an explicit replay/reset.
Recordings were regenerated from both corrected controllers; old numeric sponge
results are superseded by `data/soft-outcomes.json`.

The workcell camera is closer for both objects. Rubber uses irregular molded
grain; mineral laminate uses fine embedded flecks. Color, micro-height and
roughness are generated independently at 512-pixel resolution.
