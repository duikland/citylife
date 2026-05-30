// Construction + economy + power + zoning.
// The colony plans parcels, branches roads off the nearest existing road, and an architect
// designs homes, workplaces (commercial/industrial), or solar farms based on what's needed.
// Crew trucks build them; colonists arrive, take jobs, and a daily economy (scaled by
// employment) funds continued growth.
import { RNG } from '../engine/rng'
import { COLONY } from './config'
import type { ColonyState } from './sim'

export type BuildKind = 'habitat' | 'commercial' | 'industrial' | 'solar'

export interface Parcel {
  id: number
  x: number
  y: number
}
export interface Artifact {
  id: number
  kind: BuildKind
  color: number
  height: number
  residents: number
  jobs: number
  powerLoad: number
  powerGen: number
  buildTimeMin: number
  cost: number
}
export interface ConstructionJob {
  id: number
  x: number
  y: number
  artifact: Artifact
  progress: number
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

const HAB_COLORS = [0xe6cda2, 0xd8b48a, 0xc9b08f, 0xb88a6a]
const COMMERCIAL_COLOR = 0x5fb6d8
const INDUSTRIAL_COLOR = 0xcf8b54
const SOLAR_COLOR = 0x18406a
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
  state.lastIncomeDay = state.clock.day
  state.buildingLoad = 0
  state.powerGen = 0
  state.totalJobs = 0
  for (const s of state.structures) state.occupied.add(key(s.x, s.y))
}

function designHabitat(state: ColonyState, rng: RNG): Artifact {
  return {
    id: state.buildIds++,
    kind: 'habitat',
    color: HAB_COLORS[rng.int(0, HAB_COLORS.length - 1)]!,
    height: rng.range(0.8, 1.6),
    residents: COLONY.build.residentsPerHabitat,
    jobs: 0,
    powerLoad: COLONY.build.powerLoadPerHabitat,
    powerGen: 0,
    buildTimeMin: COLONY.build.buildTimeHours * 60,
    cost: COLONY.build.habitatCost,
  }
}

function designWorkplace(state: ColonyState, rng: RNG): Artifact {
  const industrial = rng.chance(0.45)
  return {
    id: state.buildIds++,
    kind: industrial ? 'industrial' : 'commercial',
    color: industrial ? INDUSTRIAL_COLOR : COMMERCIAL_COLOR,
    height: industrial ? rng.range(0.9, 1.5) : rng.range(1.0, 1.8),
    residents: 0,
    jobs: industrial ? COLONY.build.jobsPerIndustrial : COLONY.build.jobsPerCommercial,
    powerLoad: industrial ? COLONY.build.industrialLoad : COLONY.build.commercialLoad,
    powerGen: 0,
    buildTimeMin: COLONY.build.workplaceBuildHours * 60,
    cost: industrial ? COLONY.build.industrialCost : COLONY.build.commercialCost,
  }
}

function designSolarFarm(state: ColonyState): Artifact {
  return {
    id: state.buildIds++,
    kind: 'solar',
    color: SOLAR_COLOR,
    height: 0.35,
    residents: 0,
    jobs: 0,
    powerLoad: 0,
    powerGen: COLONY.build.solarFarmOutput,
    buildTimeMin: COLONY.build.solarFarmBuildHours * 60,
    cost: COLONY.build.solarFarmCost,
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
  walk(bx, ay)
  walk(bx, by)
  return added
}

/** Nearest existing road cell (or the caravan) to (x,y) — so new roads branch off the network. */
function nearestRoadAnchor(state: ColonyState, x: number, y: number): { x: number; y: number } {
  const car = state.structures.find((s) => s.kind === 'caravan')!
  let best = { x: car.x, y: car.y }
  let bestD = Math.abs(car.x - x) + Math.abs(car.y - y)
  for (const r of state.roads) {
    const d = Math.abs(r.x - x) + Math.abs(r.y - y)
    if (d < bestD) {
      bestD = d
      best = { x: r.x, y: r.y }
    }
  }
  return best
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
    if (t.buildable[t.idx(x, y)] === 0) continue
    const k = key(x, y)
    if (state.occupied.has(k) || state.roadSet.has(k)) continue
    return { x, y }
  }
  return null
}

function peakSupply(state: ColonyState): number {
  return COLONY.power.solarPeakW + state.powerGen
}

/** Decide what the colony needs next: power, jobs, or housing. */
function chooseArtifact(state: ColonyState, rng: RNG): Artifact {
  const queuedGen = state.jobs.reduce((g, j) => g + j.artifact.powerGen, 0)
  if (state.power.loadW > (peakSupply(state) + queuedGen) * COLONY.build.powerHeadroom) {
    return designSolarFarm(state)
  }
  const pendingJobs = state.jobs.reduce((g, j) => g + j.artifact.jobs, 0)
  const jobDeficit = state.colonists - (state.totalJobs + pendingJobs)
  if (jobDeficit > COLONY.build.jobDeficitThreshold) return designWorkplace(state, rng)
  return designHabitat(state, rng)
}

/** Plan + pay for one build, branching the road off the nearest existing road. */
export function autoGrow(state: ColonyState, rng: RNG): boolean {
  if (state.buildings.length + state.jobs.length >= COLONY.build.maxBuildings) return false
  const artifact = chooseArtifact(state, rng)
  if (state.treasury < artifact.cost + 600) return false
  const cell = findGrowCell(state, rng)
  if (!cell) return false

  const anchor = nearestRoadAnchor(state, cell.x, cell.y)
  const roadCells = addRoadPath(state, anchor.x, anchor.y, cell.x, cell.y)
  state.treasury -= roadCells * COLONY.build.roadCostPerCell

  state.parcels.push({ id: state.buildIds++, x: cell.x, y: cell.y })
  state.occupied.add(key(cell.x, cell.y))
  state.treasury -= artifact.cost
  state.jobs.push({ id: state.buildIds++, x: cell.x, y: cell.y, artifact, progress: 0 })
  return true
}

/** Per-step: advance construction, settle the daily economy, and grow on an interval. */
export function stepBuild(state: ColonyState, rng: RNG, dtMin: number): void {
  for (let i = state.jobs.length - 1; i >= 0; i--) {
    const j = state.jobs[i]!
    j.progress += dtMin / j.artifact.buildTimeMin
    if (j.progress >= 1) {
      state.buildings.push({ id: j.id, x: j.x, y: j.y, artifact: j.artifact })
      const a = j.artifact
      if (a.kind === 'solar') state.powerGen += a.powerGen
      else {
        state.colonists += a.residents
        state.totalJobs += a.jobs
        state.buildingLoad += a.powerLoad
      }
      state.jobs.splice(i, 1)
    }
  }

  if (state.clock.day > state.lastIncomeDay) {
    const days = state.clock.day - state.lastIncomeDay
    state.lastIncomeDay = state.clock.day
    const employed = Math.min(state.colonists, state.totalJobs)
    const rate = state.colonists > 0 ? employed / state.colonists : 0
    const income = state.colonists * COLONY.economy.incomePerColonistPerDay * (0.6 + 0.4 * rate)
    const upkeep = state.buildings.length * COLONY.economy.buildingUpkeepPerDay + state.roads.length * COLONY.economy.roadUpkeepPerDay
    state.treasury += (income - upkeep) * days
  }

  if (state.clock.totalMinutes - state.lastGrowMin >= COLONY.build.growIntervalHours * 60) {
    state.lastGrowMin = state.clock.totalMinutes
    autoGrow(state, rng)
  }
}
