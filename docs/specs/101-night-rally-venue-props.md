# Spec 101 — Night Rally Venue Props

- status: built
- proposed-by: jack (Phase-1 Street Rod S4)
- date: 2026-06-25
- depends-on: Spec 097 Rally Point, Spec 100 Blender Asset Pipeline

## Why

Phase-1 Street Rod needs the hilltop rally to read as a place where friends meet at night, not only a marker cell. The Blender GLB pipeline proves authored assets can be loaded, but S4 remains a code-driven world-dressing slice so the rally can gain deterministic, reviewable hangout props without moving the rally marker or changing car/rally runtime logic.

## Mechanic

`src/colony/render/venueProps.ts` builds a render-only `VenuePropsLayer` around the existing `SeedStructure(kind === "rally")`. It mirrors the established `shoreProps.ts` pattern: compute deterministic grid placements, build plain three.js instanced meshes, expose `update(daylight, timeMs)` for night glow, and expose `dispose()` for renderer teardown.

The layer adds a small ring of lanterns, stools, crates and additive glow floors around the rally. The placement is derived only from the rally city cell and deterministic cell hashing. It reads `terrain`, `roadSet`, `occupied`, and `structures` read-only; it never edits sim placement, road grading, the rally marker branch, car logic, furniture, or race code.

## Rules and data

- Placement source: `structures.find((s) => s.kind === "rally")`.
- Blocked cells: `roadSet`, `occupied`, and structure footprints, including the rally footprint.
- Terrain safety: in bounds, not water, and `buildable !== 0`.
- Determinism: no `Math.random`, no `Date.now`; cell variation comes from integer hashing.
- Public safety: no player-authored text is introduced.
- Night visibility: lantern emissive materials and floor glow maintain an emissive floor at night via `update(daylight, timeMs)`.

## Cost

This is a render-only Phase-1 dressing layer. It adds a handful of instanced meshes and one deterministic placement pass during renderer structure build. It has no simulation cost, no economy side effects, and no new persistence.

## Acceptance

- Deterministic vitest proves the same prop cells are produced on two runs.
- Test proves prop cells do not intersect `roadSet`, `occupied`, or the rally footprint.
- PlanetRenderer registers the layer additively and updates it each frame.
- Docs and tests land in the same PR.
