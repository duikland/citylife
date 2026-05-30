// Phase B — the construction loop: the colony plans parcels, lays roads, an architect
// designs habitats, and a construction job builds them over time while colonists arrive.
// Framework-agnostic; operates on ColonyState.
import { RNG } from '../engine/rng'
import { COLONY } from './config'
import type { ColonyState } from './sim'

export interface Parcel {
  id: number
  x: number
  y: number
}
export interface Artifact {
  id: number
  color: number
  height: number
  residents: number
  powerLoad: number
  buildTimeMin: number
  cost: number
}
export interface ConstructionJob {
  id: number
  x: number
  y: number
  artifact: Artifact
  progress: number // 0..1
}
export interface ColonyBuilding {
  id: number
  x: number
  y: number
  artifact: Artifact
}
export interface RoadCell {
  x: number
  y: number
}

const HAB_COLORS = [0xe6cda2, 0xd8b48a, 0xc9b08f, 0x8fb6c9, 0xb88a6a]
const key = (x: number, y: number) => x + ',' + y

export function initBuild(state: ColonyState): void {
  state.treasury = COLONY.build.treasuryStart
  state.parcels = []
  state.jobs = []
  state.buildings = []
  state.roads = []
  state.roadSet = new Set()
  state.occupied = new Set()
  state.buildIds = 1
  state.lastGrowMin = state.clock.totalMinutes
  state.buildingLoad = 0
  for (const s of state.structures) state.occupied.add(key(s.x, s.y))
}

function designHabitat(state: ColonyState, rng: RNG): Artifact {
  return {
    id: state.buildIds++,
    color: HAB_COLORS[rng.int(0, HAB_COLORS.length - 1)]!,
    height: rng.range(0.8, 1.6),
    residents: COLONY.build.residentsPerHabitat,
    powerLoad: COLONY.build.powerLoadPerHabitat,
    buildTimeMin: COLONY.build.buildTimeHours * 60,
    cost: COLONY.build.habitatCost,
  }
}

/** Manhattan road from (ax,ay) to (bx,by); adds new non-water road cells, returns count added. */
function addRoadPath(state: ColonyState, ax: number, ay: number, bx: number, by: number): number {
  const t = state.terrain
  let added = 0
  let x = ax
  let y = ay
  const walk = (tx: number, ty: number) => {
    let guard = 0
    while ((x !== tx || y !== ty) && guard++ < 400) {
      if (x !== tx) x += Math.sign(tx - x)
      else y += Math.sign(ty - y)
      if (!t.inBounds(x, y)) continue
      const k = key(x, y)
      if (!state.roadSet.has(k) && !t.water[t.idx(x, y)]) {
        state.roadSet.add(k)
        state.roads.push({ x, y })
        added++
      }
    }
  }
  walk(bx, ay) // horizontal leg
  walk(bx, by) // vertical leg
  return added
}

function findGrowCell(state: ColonyState, rng: RNG): { x: number; y: number } | null {
  const car = state.structures.find((s) => s.kind === 'caravan')!
  const t = state.terrain
  for (let tries = 0; tries < 140; tries++) {
    const r = rng.int(2, COLONY.build.growRadius)
    const ang = rng.next() * Math.PI * 2
    const x = Math.round(car.x + Math.cos(ang) * r)
    const y = Math.round(car.y + Math.sin(ang) * r)
    if (!t.inBounds(x, y)) continue
    if (t.buildable[t.idx(x, y)] === 0) continue // no water / steep
    const k = key(x, y)
    if (state.occupied.has(k) || state.roadSet.has(k)) continue
    return { x, y }
  }
  return null
}

/** Plan + pay for one new habitat (road + parcel + construction job). Returns true if started. */
export function autoGrow(state: ColonyState, rng: RNG): boolean {
  if (state.buildings.length + state.jobs.length >= COLONY.build.maxBuildings) return false
  const artifact = designHabitat(state, rng)
  if (state.treasury < artifact.cost + 600) return false
  const cell = findGrowCell(state, rng)
  if (!cell) return false

  const car = state.structures.find((s) => s.kind === 'caravan')!
  const roadCells = addRoadPath(state, car.x, car.y, cell.x, cell.y)
  state.treasury -= roadCells * COLONY.build.roadCostPerCell

  state.parcels.push({ id: state.buildIds++, x: cell.x, y: cell.y })
  state.occupied.add(key(cell.x, cell.y))
  state.treasury -= artifact.cost
  state.jobs.push({ id: state.buildIds++, x: cell.x, y: cell.y, artifact, progress: 0 })
  return true
}

/** Per-step: advance construction jobs; periodically start a new build. */
export function stepBuild(state: ColonyState, rng: RNG, dtMin: number): void {
  for (let i = state.jobs.length - 1; i >= 0; i--) {
    const j = state.jobs[i]!
    j.progress += dtMin / j.artifact.buildTimeMin
    if (j.progress >= 1) {
      state.buildings.push({ id: j.id, x: j.x, y: j.y, artifact: j.artifact })
      state.colonists += j.artifact.residents
      state.buildingLoad += j.artifact.powerLoad
      state.jobs.splice(i, 1)
    }
  }
  if (state.clock.totalMinutes - state.lastGrowMin >= COLONY.build.growIntervalHours * 60) {
    state.lastGrowMin = state.clock.totalMinutes
    autoGrow(state, rng)
  }
}
