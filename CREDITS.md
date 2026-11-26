# Sources and visual provenance

- The opening point-cloud renderer (`docs/assets/vendor/unigeom-geometry.js`) and dataset (`docs/assets/data/geometry.json`) are reused from [NEBULIS-Lab/UniGeom](https://github.com/NEBULIS-Lab/UniGeom), under its MIT license. Copyright 2026 Shuaijun Liu and Feiyang. This presentation calls the original renderer through a small adapter and does not alter the data.
- The opening visualization uses the dataset's first model pair, with 606 common observations. Three-dimensional t-SNE coordinates are for visualization. Correspondence lines join the same observation IDs; shared nearest neighbors come from original 192-dimensional features. Moving particles and camera rotation are visual effects, not learned transformations or time evolution.
- The first project's palette, typographic treatment and spatial presentation inspired this continuation. The revised architecture drawings follow its framework vocabulary: slanted model blocks, layered token grids, consistent arrowheads, frozen-model lock symbols and magnified mechanism insets. The cross-modal interface diagram, WAM diagram and roadmap graphics are newly authored SVG illustrations. The second page now uses the physical workcell documented below.
- The UniGeom-X interface and UniGeom-M architecture diagrams remain **conceptual research illustrations**. The second-page workcell is different: it displays complete MuJoCo executions and measured simulated contact forces from scripted controllers. It does not claim checkpoint inference or a completed cross-modal learning experiment.
- The second and third projects' research plans supplied the content. The two initial task families are insertion and grasp/slip recovery. Additional modalities and platforms remain optional and require appropriate data acquisition support.
- Manrope is redistributed with its [SIL Open Font License](docs/assets/fonts/OFL.txt). Chinese text uses system fonts.

The publication contains no third-party remote embeds, analytics, model weights, private experiment logs or machine-specific configuration.

## Physical grasp workcell

The second-page workcell reuses CarryQ’s Panda assets, IK solver, material helpers and live/recorded presentation approach. Third-party notices, detailed provenance and measurement semantics are retained in [workcell credits](docs/assets/workcell/CREDITS.md). Recorded and live modes use the same scene/controller; both feedback success and fixed-grip failure are preserved. Contact maps are solver-load visualizations, not optical tactile images.
