# Bot House Builder — research (spec 077)

- date: 2026-06-09
- author: claude, synthesising four parallel research tracks for the spec-077 design

## The problem

CityLife raises a deterministic voxel cottage on each newcomer homestead. The current
`voxelHouse.buildVoxelHouse()` is a single-layer block model: one 1x1x1 block per world cell, drawn
as instances of a single BoxGeometry InstancedMesh (VOX_CAP 6000). Three gaps separate this from the
operator goal — a bot that designs and builds its own house, block by block, that does not look like
minecraft:

1. Resolution. One block per cell is too coarse for architecture (thin walls, steps, recessed doors).
2. No design authorship. The house is a pure function of (seed, doorDir, maxW, maxD) — no artifact a
   bot can author, inspect, diff, mutate or store.
3. No build loop. buildHouse flips built=true in one tick — no design step, no block-by-block sim.

## What the research found (four tracks)

### Track A — fine voxels plus greedy meshing (avoid the minecraft look)

The fix for blocky is not fewer blocks — it is more, smaller blocks merged into unified silhouettes.
Subdivide each 1x1 plot cell into a 4x4x4 micro-grid (64 mini-blocks per cell, ~256-384 per house),
store occupancy in a compact Uint8Array, then run greedy meshing: scan axis-aligned planes, merge
coplanar runs of the same block-kind into single quads, and emit ONE merged BufferGeometry per house
(one draw call), not per-block instances. This cuts triangles 10-40x, stays far under VOX_CAP, and —
critically — flat-shaded merged quads read as deliberate architecture, not random cubes. Build
animation emits z-band layers on a timer, rebuilding the merged mesh per frame (cheap for a 1-2s
window). Pitfall: per-block InstancedMesh at micro-resolution is ~18k draw calls and kills the frame
rate — merge instead.

### Track B — the sandcastle 2D wall-layer signal

The operator other repo (duikland/sandcastle, an AI floor-plan to 3D generator) stores walls as
start/end segments with thickness plus a reviewed flag, detects rooms as enclosed polygons from wall
edges, and bills only reviewed walls. Its continuous geometry and arbitrary-angle math are
overengineered for a tile grid, but three patterns transfer: separate entity (wall) from business
logic (material estimate); a top-down grid-snapped edit mode; room detection by enclosure (simplified
to flood-fill on a tile grid). Signal: keep a 2D wall/floor-plan layer as the editable representation;
derive 3D plus costs from it.

### Track C — the deterministic blueprint format

A house should be data, not a script run: a compact representation with room-zone metadata,
parametrically scaled to the plot tile count, fully deterministic from a seed (no wall-clock), with a
validation layer (rooms enclosed, door reachable, nothing escapes the plot). Blueprints are ~200-500
bytes, inspectable, diffable, atomically mutable by a bot, unit-testable as pure data. Chosen format:
a single-line whitespace-token text DSL (LLM-writable in one breath, git-diffable) over JSON.

### Track D — the bot design loop

A 4-layer loop: a declarative blueprint artifact both game and bot understand; one universal
buildHouse compiler shared by game render and headless bot; a visual editor with Playwright
data-action hooks so the same UI is human-clickable and bot-drivable; a self-inspection pipeline —
after compile the bot gets a BlueprintReport (block/room/window counts, problems) plus an optional
top-down PNG plus the existing firstPersonView/firstPersonPNG, decides on exactly one mutation, and
iterates, capped at 3. The blueprint is persisted on the citizen for deterministic regeneration.

## Synthesis

A text blueprint DSL (bot-writable), authored procedurally or in a separate visual builder route,
compiled by ONE universal builder into a 4x4x4 micro-occupancy grid, greedy-meshed into a unified
low-poly house, gated on materials plus labour with a block-by-block build sim. The blueprint is stored
on the citizen and regenerates the identical house on the plot in both the game and a headless bot
container.

## Sources

- Live tree: src/colony/voxelHouse.ts, render/PlanetRenderer.ts (updateNeighborhood, voxelMesh,
  VOX_CAP 6000), runtime.ts (decideNewcomer, assignLot, buildHouse, firstPersonPNG), neighborhood.ts
  (Parcel houseZone), config.ts (matNeighborHouse 20), engine/rng.ts (mulberry32), vite.config.ts
  (multi-HTML discovery, port 5188).
- Greedy meshing prior art: 0fps / Mikola Lysenko, Minecraft pre-1.13 face culling, low-poly refs
  Crossy Road and Poly Bridge.
- duikland/sandcastle: types.ts, services/geometryService.ts, App.tsx, WallAnalysis/ThreeScene/
  AnalysisPanel/QuotePanel components.
