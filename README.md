# UniGeom Series — Research Presentation

A five-page interactive introduction to **UniGeom-X: Shared Geometry for Cross-Modal Robotics** and **UniGeom-M: A Multimodal World-Action Model for Robotic Interaction**, starting from the first UniGeom project.

**Shuaijun × Feiyang**

The presentation is primarily in English, with one short Chinese explanation on each of its five pages. It continues the visual language of the [original UniGeom website](https://nebulis-lab.com/UniGeom/). UniGeom-X and UniGeom-M are research plans: their diagrams illustrate proposed mechanisms, not trained-model outputs or experimental results.

## Five pages

1. **From UniGeom:** lightweight interfaces connect independently trained perception and existing world-model dynamics. Reuses the first project's measured representation visualization.
2. **UniGeom-X / sensory handover:** a robot uses vision and depth to approach a target, then adds tactile evidence for contact and insertion. Select the interaction stage or introduce local visual occlusion.
3. **UniGeom-X / functional interfaces:** preserve independent encoders, align relevant shared relations, retain modality-specific information and carry task state forward. Compare state and transition relations; connect or disconnect the tactile branch.
4. **UniGeom-M / native multimodal learning:** adapt a pretrained World-Action Model to jointly represent future observations and actions. Switch between joint generation and action-conditioned prediction; compare two qualitative action scenarios.
5. **Research roadmap:** distinguish model reuse, modular sensory collaboration and native multimodal learning, while sharing environments, synchronized data and contact-rich tasks.

X investigates how existing independent sensory capabilities can work together. M investigates how these capabilities can be learned within a unified World-Action Model. Architecture choices and claimed benefits remain subject to experiments.

## Run locally

No build tool or external CDN is required. Serve the `docs` directory over HTTP (ES modules and the local dataset require an HTTP origin):

```bash
python3 -m http.server 8000 --directory docs
```

Open `http://localhost:8000`. Use chapter tabs, arrow keys, Page Up / Page Down, or the page buttons. On mobile, use the chapter selector or swipe horizontally. Each animated page has an independent pause control; reduced-motion preferences are respected.

## Publication

Static files live in `docs/`. The live presentation is at **[shuaijun-liu.github.io/UniGeom-X](https://shuaijun-liu.github.io/UniGeom-X/)**. Source changes belong on `main`, where the validation workflow checks their integrity. GitHub Pages publishes the root of `gh-pages`, respecting the repository's deployment branch protection. After committing changes on `main`, publish with:

```bash
bash scripts/publish.sh
```

The script validates assets, pushes `main`, and updates `gh-pages` with the committed `docs/` tree. GitHub's Pages workflow then builds and deploys the site. It does not force-push or change the current working branch.

```bash
python3 tests/check_site.py
```

Browser checks, with Playwright and Chromium installed:

```bash
node tests/browser.cjs http://localhost:8000/
```

The browser check covers navigation and history, interactive controls, measured-data loading, animation pause, reduced motion, and desktop/mobile layouts. `CHROMIUM_PATH` can optionally select an existing Chromium executable.

See [CREDITS.md](CREDITS.md) for asset provenance and the distinction between measured data and schematic animation.
