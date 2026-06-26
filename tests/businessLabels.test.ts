import { describe, expect, it, vi } from "vitest";
import { ColonyRuntime } from "../src/colony/runtime";
import { isPublicSafe } from "../src/colony/newcomers";
import {
  businessLabelModel,
  surveyBusinessLabels,
} from "../src/colony/commerce/businessLabels";

const RT_CACHE = new Map<number, ColonyRuntime>();
function rtFor(seed: number): ColonyRuntime {
  let rt = RT_CACHE.get(seed);
  if (!rt) {
    rt = new ColonyRuntime(seed);
    RT_CACHE.set(seed, rt);
  }
  return rt;
}

describe("commercial business labels", () => {
  it("surveys one public-safe floating label above each shop parcel that has a business", () => {
    const rt = rtFor(4242);
    const labels = surveyBusinessLabels(rt.commercialDistrict!);
    const parcelsWithBusiness = rt.commercialDistrict!.parcels.filter(
      (p) => p.business,
    );

    expect(labels.map((l) => l.shopId)).toEqual(
      parcelsWithBusiness.map((p) => p.id),
    );
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some((l) => l.businessId === "sportifine_club")).toBe(true);
    expect(labels.map((l) => l.text)).toContain("Sports Club");
    expect(labels.map((l) => l.text)).not.toContain("Sportifine Club");
    for (const label of labels) {
      const parcel = parcelsWithBusiness.find((p) => p.id === label.shopId)!;
      expect(label.x).toBe(parcel.x + (parcel.w - 1) / 2);
      expect(label.y).toBe(parcel.y + (parcel.h - 1) / 2);
      expect(label.height).toBeGreaterThan(2.5);
      expect(isPublicSafe(label.text)).toBe(true);
      expect(label.nightEmissiveFloor).toBeGreaterThan(0);
      expect(label.nightEmissiveFloor).toBeLessThanOrEqual(label.nightEmissivePeak);
    }
  });

  it("screens unsafe business names instead of rendering them", () => {
    const label = businessLabelModel(
      {
        id: "bad_shop",
        kind: "store",
        x: 10,
        y: 20,
        w: 6,
        h: 5,
        side: 1,
        doorX: 13,
        doorY: 25,
        built: false,
        business: "nearest_bar",
      },
      {
        id: "nearest_bar",
        name: "secret token mall",
        app: "open lot",
        tagline: "safe",
        palette: 0x18e0ff,
        emblem: "dish",
        seating: false,
        marquee: false,
      },
    );

    expect(label).toBeNull();
  });

  it("is deterministic and touches no wall-clock or RNG", () => {
    const rt = rtFor(4242);
    const fresh = new ColonyRuntime(4242);
    const dateSpy = vi.spyOn(Date, "now");
    const randSpy = vi.spyOn(Math, "random");
    try {
      const a = surveyBusinessLabels(rt.commercialDistrict!);
      const b = surveyBusinessLabels(fresh.commercialDistrict!);
      expect(b).toEqual(a);
      expect(dateSpy).not.toHaveBeenCalled();
      expect(randSpy).not.toHaveBeenCalled();
    } finally {
      dateSpy.mockRestore();
      randSpy.mockRestore();
    }
  });
});
