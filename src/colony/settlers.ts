// Settlers: named, KOOKER-carded residents with a unique home. Placement on the grid + local
// persistence (their lot positions) so they remain across refresh. Identity lives in kooker;
// each house is regenerated deterministically from the KOOKER id.
import { RNG } from '../engine/rng'
import { claimLot } from './build'
import { designHouse, type HouseSpec } from './house'
import type { KookerCard } from './kooker'
import type { ColonyState } from './sim'

export interface Settler {
  kookerId: number
  name: string
  x: number
  y: number
  house: HouseSpec
}

/** Place a registered settler on a fresh lot with their unique home. */
export function addSettler(state: ColonyState, rng: RNG, card: KookerCard): Settler | null {
  const lot = claimLot(state, rng)
  if (!lot) return null
  const settler: Settler = { kookerId: card.id, name: card.name, x: lot.x, y: lot.y, house: designHouse(card.id) }
  state.settlers.push(settler)
  state.colonists += 2 // the settler + their household
  return settler
}

const LS_KEY = 'citylife.settlers.v1'

export function saveSettlers(state: ColonyState): void {
  try {
    const slim = state.settlers.map((s) => ({ kookerId: s.kookerId, name: s.name, x: s.x, y: s.y }))
    localStorage.setItem(LS_KEY, JSON.stringify(slim))
  } catch {
    /* no storage (tests / private mode) */
  }
}

/** Re-place previously-registered settlers at their saved lots (homes regenerate from the id). */
export function restoreSettlers(state: ColonyState): number {
  let saved: { kookerId: number; name: string; x: number; y: number }[] = []
  try {
    const raw = localStorage.getItem(LS_KEY)
    saved = raw ? JSON.parse(raw) : []
  } catch {
    return 0
  }
  for (const s of saved) {
    state.occupied.add(s.x + ',' + s.y)
    state.settlers.push({ kookerId: s.kookerId, name: s.name, x: s.x, y: s.y, house: designHouse(s.kookerId) })
    state.colonists += 2
  }
  return saved.length
}
