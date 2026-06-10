import { describe, it, expect } from 'vitest'
import { ColonySim } from '../src/colony/sim'

// Roads v2 — the block frame is now ROUTED with the least-cost pathfinder (cellOk + slope weight)
// instead of stamped as rigid straight lines, so roads contour around water and steep ground. These
// pin the planner's contract: dry roads, deterministic layout, and a connected starting frame.

describe('road planning — least-cost routed block frames', () => {
  it('never lays a road cell on water', () => {
    const sim = new ColonySim(42)
    const t = sim.state.terrain
    for (const r of sim.state.roads) {
      expect(t.isWater(r.x, r.y), `road cell ${r.x},${r.y} is wet`).toBe(false)
    }
  })

  it('keeps roads off blocked-steep ground when a route exists (contour, not fall line)', () => {
    const sim = new ColonySim(42)
    const t = sim.state.terrain
    // The landing block sits on chosen-flat ground, so the routed frame should be on buildable cells.
    const bad = sim.state.roads.filter((r) => t.buildable[t.idx(r.x, r.y)] === 0)
    // Allow a tiny fallback remainder (straight-line fill when an edge cannot route), but the frame
    // must be overwhelmingly on good ground.
    expect(bad.length).toBeLessThanOrEqual(Math.ceil(sim.state.roads.length * 0.1))
  })

  it('is deterministic — the same seed lays the identical network', () => {
    const a = new ColonySim(1234).state.roads.map((r) => `${r.x},${r.y}`).join('|')
    const b = new ColonySim(1234).state.roads.map((r) => `${r.x},${r.y}`).join('|')
    expect(a).toBe(b)
  })

  it('the landing frame is non-empty and 4-connected enough to walk (each cell has a road neighbour)', () => {
    const sim = new ColonySim(42)
    const set = new Set(sim.state.roads.map((r) => `${r.x},${r.y}`))
    expect(set.size).toBeGreaterThan(0)
    let isolated = 0
    for (const r of sim.state.roads) {
      const hasNeighbour = set.has(`${r.x + 1},${r.y}`) || set.has(`${r.x - 1},${r.y}`) || set.has(`${r.x},${r.y + 1}`) || set.has(`${r.x},${r.y - 1}`)
      if (!hasNeighbour) isolated++
    }
    expect(isolated).toBe(0)
  })
})
