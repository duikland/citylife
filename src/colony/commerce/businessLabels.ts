// Spec 106 — read-only commercial POI labels. This file turns the already-surveyed commercialDistrict.parcels
// business identities into public-safe, deterministic label models; it never writes world-gen, terrain, parcels,
// or business assignment state.
import type { ShopParcel } from "./district";
import { BUSINESSES, type Business } from "./businesses";
import { isPublicSafe } from "../newcomers";

export interface BusinessLabel {
  shopId: string;
  businessId: string;
  text: string;
  x: number;
  y: number;
  height: number;
  color: number;
  nightEmissiveFloor: number;
  nightEmissivePeak: number;
}

const WALL_H: Record<ShopParcel["kind"], number> = {
  kiosk: 0.9,
  store: 1.25,
  showroom: 1.7,
};

const SAFE_LABEL_FALLBACK: Partial<Record<Business["id"], string>> = {
  sportifine_club: "Sports Club",
};

export function businessLabelModel(
  parcel: ShopParcel,
  business: Business,
): BusinessLabel | null {
  if (!parcel.business) return null;
  if (!isPublicSafe(parcel.id)) return null;
  const text = isPublicSafe(business.name)
    ? business.name
    : SAFE_LABEL_FALLBACK[business.id];
  if (!text || !isPublicSafe(text)) return null;
  const x = parcel.x + (parcel.w - 1) / 2;
  const y = parcel.y + (parcel.h - 1) / 2;
  return {
    shopId: parcel.id,
    businessId: business.id,
    text,
    x,
    y,
    height: WALL_H[parcel.kind] + 1.7,
    color: business.palette,
    nightEmissiveFloor: 0.65,
    nightEmissivePeak: 1.45,
  };
}

export function surveyBusinessLabels(district: {
  parcels: readonly ShopParcel[];
}): BusinessLabel[] {
  const out: BusinessLabel[] = [];
  for (const parcel of district.parcels) {
    if (!parcel.business) continue;
    const business = BUSINESSES[parcel.business];
    const label = businessLabelModel(parcel, business);
    if (label) out.push(label);
  }
  return out;
}
