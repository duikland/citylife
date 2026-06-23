export const SCHEMA_VERSION = 1 as const;

export type ArtifactKind =
  | "house"
  | "furniture"
  | "tree"
  | "prop"
  | "landscaping";

export type ArtifactCategory =
  | "furniture"
  | "lighting"
  | "greenery"
  | "civic-art";

export type ArtifactVariant = "bench" | "lamppost" | "planter" | "fountain";

export interface ArtifactTransform {
  x: number;
  y: number;
  rot: number;
}

export interface ArtifactFootprint {
  w: number;
  h: number;
}

export interface ArtifactDef {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  kind: ArtifactKind;
  transform: ArtifactTransform;
  footprint: ArtifactFootprint;
  category: ArtifactCategory;
  children?: ArtifactDef[];
  data: {
    variant: ArtifactVariant;
    [key: string]: unknown;
  };
}

export interface ArtifactKindRegistration {
  kind: ArtifactKind;
  variants: ArtifactVariant[];
  defaultCategory: ArtifactCategory;
}

export const ARTIFACT_KIND_REGISTRY: Record<
  ArtifactKind,
  ArtifactKindRegistration
> = {
  house: {
    kind: "house",
    variants: [],
    defaultCategory: "furniture",
  },
  furniture: {
    kind: "furniture",
    variants: ["bench"],
    defaultCategory: "furniture",
  },
  tree: {
    kind: "tree",
    variants: [],
    defaultCategory: "greenery",
  },
  prop: {
    kind: "prop",
    variants: ["lamppost", "fountain"],
    defaultCategory: "lighting",
  },
  landscaping: {
    kind: "landscaping",
    variants: ["planter"],
    defaultCategory: "greenery",
  },
};

export interface VisualArtifact extends ArtifactDef {
  x: number;
  y: number;
  rot: number;
}

export function serializeArtifactDef(def: ArtifactDef): string {
  return JSON.stringify(def);
}

export function deserializeArtifactDef(serialized: string): ArtifactDef {
  const parsed = JSON.parse(serialized) as Partial<ArtifactDef>;
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported artifact schema version: ${parsed.schemaVersion}`);
  }
  if (!parsed.id || !parsed.kind || !parsed.transform || !parsed.footprint) {
    throw new Error("Invalid artifact definition: missing required fields");
  }
  return parsed as ArtifactDef;
}

export function visualArtifactToDef(artifact: VisualArtifact): ArtifactDef {
  const { x: _x, y: _y, rot: _rot, ...def } = artifact;
  return {
    ...def,
    transform: { ...artifact.transform },
    footprint: { ...artifact.footprint },
    children: artifact.children?.map((child) => deserializeArtifactDef(serializeArtifactDef(child))),
    data: { ...artifact.data },
  };
}

export function visualArtifactFromDef(def: ArtifactDef): VisualArtifact {
  return {
    ...def,
    transform: { ...def.transform },
    footprint: { ...def.footprint },
    children: def.children?.map((child) => deserializeArtifactDef(serializeArtifactDef(child))),
    data: { ...def.data },
    x: def.transform.x,
    y: def.transform.y,
    rot: def.transform.rot,
  };
}

export function artifactVariant(def: ArtifactDef): ArtifactVariant {
  return def.data.variant;
}
