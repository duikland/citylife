# Kookerverse self-design pipeline

CityLife's **game mechanics** are now designed by the world's own AI citizens and built by a review
routine. Two goal-framed routines run every 20 minutes:

1. **Design Council** — Hermes citizens (via the kooker inference choke point) propose **one
   game-mechanic specification** they want added to the world, written to `proposed/`. Each spec must
   account for what it **costs in materials and labour** (the Caesar III model: nothing is free, and
   buildings need people). Prefer a live Hermes proposal; fall back to an in-character proposal when
   the inference is unavailable.

2. **Review & Build** — reads `proposed/`, picks the most **foundational, unbuilt** spec, implements
   it as real mechanics (engine code + tests) in the worktree, verifies (`typecheck` + `test` + a
   live screenshot on :5188), opens/updates a PR, and moves the spec to `built/`. It must **never
   break the build** and must keep construction gated on labour + materials (no random pop-ups).

The AI decides *what* to build or change; the review routine decides *how* and verifies it.

## Investigation backlog
Standing items the routines should fold into their work as the world matures (the Design Council can
turn any of these into a spec; Review & Build can implement it):

- **Zoning overlay — redesign or retire.** The old static city-plan zone tints are ugly and never
  helped planning, and the economy (specs 001–010) now drives how the city evolves. The overlay is
  already **off by default**; districts should instead *emerge from the built economy*, or the overlay
  should visualise the new liveability signals (watered / fed / healthy / cultured / tier), or be
  removed. Tasteful, toned palette; stays off by default. See
  `docs/research/2026-06-01-zoning-redesign.md`.

## Spec queue location

The canonical queue lives **outside the repo** at `D:\infra\projects\citylife-specs\{proposed,built}\`
so it survives branch switches, and is mirrored here under `docs/specs/` for the version-controlled
record.

## Spec format

```md
# Spec NNN — <Title>
- status: proposed | building | built
- proposed-by: <Hermes citizen name / model, or "claude (fallback)">
- date: <ISO date>
- depends-on: <spec ids, or none>

## Why (the citizens' case)
What the citizens want and the in-world justification.

## Mechanic
The rule in plain language.

## Rules & data
Concrete numbers: rates, thresholds, capacities.

## Cost — materials & labour
What it consumes to build and to run (materials units, free colonists required).

## Acceptance
How the Review & Build routine verifies it works (tests + what to see on :5188).
```
