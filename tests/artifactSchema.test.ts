import { describe, expect, it } from "vitest";
import {
  ARTIFACT_KIND_REGISTRY,
  SCHEMA_VERSION,
  deserializeArtifactDef,
  serializeArtifactDef,
  visualArtifactFromDef,
  visualArtifactToDef,
  type ArtifactDef,
} from "../src/colony/artifactSchema";
import { ColonySim } from "../src/colony/sim";

const GOLDEN_BENCH_V1: ArtifactDef = {
  schemaVersion: 1,
  id: "artifact-0-bench",
  kind: "furniture",
  transform: { x: 39, y: 45, rot: Math.PI * 0.5 },
  footprint: { w: 1.4, h: 0.55 },
  category: "furniture",
  data: { variant: "bench" },
};

describe("artifact schema", () => {
  it("defines a versioned registry for every supported artifact kind", () => {
    expect(SCHEMA_VERSION).toBe(1);
    expect(Object.keys(ARTIFACT_KIND_REGISTRY)).toEqual([
      "house",
      "furniture",
      "tree",
      "prop",
      "landscaping",
    ]);
    expect(ARTIFACT_KIND_REGISTRY.furniture.variants).toContain("bench");
    expect(ARTIFACT_KIND_REGISTRY.prop.variants).toEqual([
      "lamppost",
      "fountain",
    ]);
  });

  it("round-trips golden fixture artifacts without losing compatibility fields", () => {
    const serialized = serializeArtifactDef(GOLDEN_BENCH_V1);
    const deserialized = deserializeArtifactDef(serialized);

    expect(deserialized).toEqual(GOLDEN_BENCH_V1);
    expect(serializeArtifactDef(deserialized)).toBe(serialized);
  });

  it("migrates seeded VisualArtifact props onto ArtifactDef shape", () => {
    const sim = new ColonySim(4242);
    const [bench] = sim.state.artifacts;
    const def = visualArtifactToDef(bench);

    expect(def.kind).toBe("furniture");
    expect(def.transform).toEqual({ x: bench.x, y: bench.y, rot: bench.rot });
    expect(def.data.variant).toBe("bench");
    expect(visualArtifactFromDef(def)).toEqual(bench);
  });
});
