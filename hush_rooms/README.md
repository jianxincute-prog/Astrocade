# HUSH

A first-person, low-poly horror escape through a procedurally generated hospital ward. Stay quiet, solve three puzzles, collect three keys, and escape the Listener.

## Code and performance

- `index.html` contains the existing Three.js game, controls, puzzles, UI, and rendering loop.
- `visibility-core.mjs` contains the pure wall/sightline helpers mirrored in the self-contained game script and covered by unit tests.
- `game_config.json` stores creator-facing gameplay and graphics settings, including LOD and occlusion toggles.
- `tests/visibility-core.test.mjs` verifies blocked, open, and above-wall sightlines.

Every room keeps its full authored geometry, props, throwables, six-light pool and view distance on all quality tiers. Immutable room meshes are combined by material at build time to reduce draw calls; room/frustum occlusion and distance LOD skip work only for currently hidden or distant scene detail. Rendering is paced to a maximum of 60 updates per second; auto quality changes framebuffer resolution/antialiasing only.
