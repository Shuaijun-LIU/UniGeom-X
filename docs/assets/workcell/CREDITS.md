# Grasp workcell sources

- The inverse-kinematics implementation (`selectedIkSolver.js`) and PBR material helpers (`workcellSurfaces.js`) are copied and adapted from CarryQ. The live/recorded workcell organization, pose interpolation, camera interaction, packed geometry and lifecycle follow its `InsertionDemo.jsx`, `recordedWorkcell.js` and export workflow. CarryQ copyright and MIT terms are retained in `vendor/CARRYQ-LICENSE.txt`.
- Franka Panda meshes and the MJCF base originate in MuJoCo Menagerie and are reused through CarryQ under Apache-2.0 (`vendor/PANDA-LICENSE.txt`). The new scene adds finger-pad contacts, a free object and a destination. The original insertion fixtures and rigid attachment are not used.
- MuJoCo JavaScript/Wasm distribution 0.0.7, reporting engine 3.3.8, is redistributed under Apache-2.0 (`vendor/MUJOCO-LICENSE.txt`). It loads only when Live physics is selected.
- Three.js 0.170.0 and OrbitControls are redistributed under MIT (`vendor/THREE-LICENSE.txt`).
- Poly Haven textures are CC0; see `materials/CREDITS.md` and `materials/sources.json`.

## What is measured

Both recordings come from complete 16-second MuJoCo executions using the same scene and downward force pulse. The controller follows scripted arm poses. The feedback variant increases gripper force from ideal simulated pad shear/normal force ratios; the fixed-grip variant does not. Neither is a trained UniGeom-X model. Contact maps visualize solver contact locations and loads with a display kernel; they are not calibrated pressure images or optical tactile measurements. Relative object slip is an evaluation measurement, not an input to the grip controller.

Saved physics states and contact readouts are sampled every 20 ms; physics advances every 2 ms. The browser interpolates body poses between samples. It holds contact observations at their recorded samples and preserves each run's final success or failure. Physics stepping and the same controller run locally in Live physics. Camera movement does not change the controller's known target.

The object is rigid, freely moving and held by friction; no weld attaches it to the gripper. The stripe, goal marking and contact-map smoothing are visual aids. No deformation, damage model, learned vision inference or optical tactile renderer is claimed.

## Contact workcell v2

The new rubber mat, laminate tabletop, metal legs and concrete floor use locally
created procedural materials. The original CarryQ wood/denim maps are no longer
loaded by this scene.

The optical tactile illustration follows the physical imaging principle described
by [Yuan, Dong and Adelson, GelSight (2017)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5751610/):
colored directional illumination reveals gel surface slope, and markers reveal
lateral deformation. Visual reference: the real sensor panels in the official
[ManiSkill-ViTac 2025 peg-insertion comparison](https://ai-workshops.github.io/maniskill-vitac-challenge-2025/img/peg-insertion-sim2real.gif).
[ManiFeel](https://zhengtongxu.github.io/manifeel-website/) provides additional
TacRGB / force-field task references.

`tactile.js` is an original, analytic approximation driven by contact normal load,
contact centroid and signed pad-local shear. It assumes a compliant rectangular
imprint, not a calibrated gel mechanics model. The images are neither paper
figures nor sensor-camera measurements, and are not fed back into the controller.
The controller reads ideal MuJoCo contact forces. No external reference image or
video is redistributed as our experimental output.
