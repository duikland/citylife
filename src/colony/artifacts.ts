import type { Terrain } from "./terrain";
import {
  SCHEMA_VERSION,
  type ArtifactCategory,
  type ArtifactFootprint,
  type ArtifactKind,
  type ArtifactVariant,
  type VisualArtifact,
} from "./artifactSchema";

export type { ArtifactCategory, ArtifactFootprint, ArtifactKind, VisualArtifact };

interface CatalogSeed {
  variant: ArtifactVariant;
  kind: ArtifactKind;
  category: ArtifactCategory;
  offset: { x: number; y: number };
  rot: number;
  footprint: ArtifactFootprint;
}

const CATALOG: CatalogSeed[] = [
  {
    variant: "bench",
    kind: "furniture",
    category: "furniture",
    offset: { x: -2, y: 4 },
    rot: Math.PI * 0.5,
    footprint: { w: 1.4, h: 0.55 },
  },
  {
    variant: "lamppost",
    kind: "prop",
    category: "lighting",
    offset: { x: 3, y: 4 },
    rot: 0,
    footprint: { w: 0.35, h: 0.35 },
  },
  {
    variant: "planter",
    kind: "landscaping",
    category: "greenery",
    offset: { x: -4, y: -2 },
    rot: Math.PI * 0.25,
    footprint: { w: 1.0, h: 1.0 },
  },
  {
    variant: "fountain",
    kind: "prop",
    category: "civic-art",
    offset: { x: 4, y: -2 },
    rot: Math.PI * 0.75,
    footprint: { w: 1.6, h: 1.6 },
  },
];

function dry(terrain: Terrain, x: number, y: number): boolean {
  return terrain.inBounds(x, y) && !terrain.isWater(x, y);
}

function nearestDryCell(
  terrain: Terrain,
  x: number,
  y: number,
  used: Set<string>,
): { x: number; y: number } {
  if (dry(terrain, x, y) && !used.has(`${x},${y}`)) return { x, y };
  for (let r = 1; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (dry(terrain, nx, ny) && !used.has(`${nx},${ny}`))
          return { x: nx, y: ny };
      }
    }
  }
  return terrain.landing;
}

export function createVisualArtifacts(terrain: Terrain): VisualArtifact[] {
  const used = new Set<string>();
  return CATALOG.map((seed, index) => {
    const targetX = Math.round(terrain.landing.x + seed.offset.x);
    const targetY = Math.round(terrain.landing.y + seed.offset.y);
    const pos = nearestDryCell(terrain, targetX, targetY, used);
    used.add(`${pos.x},${pos.y}`);
    const transform = { x: pos.x, y: pos.y, rot: seed.rot };
    return {
      schemaVersion: SCHEMA_VERSION,
      id: `artifact-${index}-${seed.variant}`,
      kind: seed.kind,
      transform,
      x: transform.x,
      y: transform.y,
      rot: transform.rot,
      footprint: { ...seed.footprint },
      category: seed.category,
      data: { variant: seed.variant },
    };
  });
}
