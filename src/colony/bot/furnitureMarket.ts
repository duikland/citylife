// Spec 088 Slice F — the Kookerbook FURNITURE MARKETPLACE / classifieds. Players advertise furniture
// designs they own; others browse the public board and buy their own copy from the studio. Two layers,
// both fail-soft, mirroring furnitureStore/blueprintStore:
//
//   • LOCAL — a localStorage list. Always written; offline/dev reloads keep the board with no backend.
//   • BACKEND — best-effort PUT/GET through the /kooker proxy AS THE LOGGED-IN PLAYER: never blocks the
//     game, tolerates 404s while the kooker-side endpoint ships separately, and wins per listing on
//     restore (the shared cross-device board).
//
// PLAYER DATA ISOLATION: every listing is isPublicSafe-screened on write AND read, so a name can never
// carry a brand word onto the public board — a screened-out listing is simply never returned. The id is
// recomputed from seller + kind + name (it embeds the inventory itemId via ownedFurnitureId), so a
// tampered id can never spoof a listing, and one seller has at most one listing per design.
import { getAuthClient } from "../authClient";
import { FURNITURE_KINDS, type FurnitureKind } from "../furniture";
import { isPublicSafe } from "../newcomers";
import { ownedFurnitureId } from "./furnitureStore";

const LS_MARKET = "citylife.furniture.market.v1";
const BACKEND_PATH = "/kooker/api/v1/citylife/furniture-market";

/** The most listings the public board holds — bounds storage and a runaway listing loop. */
export const MARKET_LISTINGS_CAP = 256;

/** One furniture listing on the public board. `id` = `${sellerCitizenId}:${ownedFurnitureId(kind,name)}`,
 *  so it embeds the seller's inventory item id and one seller has a single listing per design. */
export interface FurnitureListing {
  id: string;
  sellerCitizenId: string;
  kind: FurnitureKind;
  name: string;
  price: number;
}
export type Market = FurnitureListing[];

/** The stable listing id for a seller's design — embeds the inventory itemId so the two cross-reference. */
export function listingId(
  sellerCitizenId: string,
  kind: FurnitureKind,
  name: string,
): string {
  return `${sellerCitizenId}:${ownedFurnitureId(kind, name)}`;
}

/** Validate one listing, recomputing its id (a tampered id is ignored) and screening the name. Returns a
 *  clean listing, or null when the seller/kind/name/price is missing, unknown, unsafe or non-positive. */
function safeListing(e: unknown): FurnitureListing | null {
  if (!e || typeof e !== "object") return null;
  const { sellerCitizenId, kind, name, price } = e as {
    sellerCitizenId?: unknown;
    kind?: unknown;
    name?: unknown;
    price?: unknown;
  };
  if (typeof sellerCitizenId !== "string" || sellerCitizenId.length === 0)
    return null;
  if (
    typeof kind !== "string" ||
    !FURNITURE_KINDS.includes(kind as FurnitureKind)
  )
    return null;
  if (typeof name !== "string" || name.length === 0 || !isPublicSafe(name))
    return null;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0)
    return null;
  return {
    id: listingId(sellerCitizenId, kind as FurnitureKind, name),
    sellerCitizenId,
    kind: kind as FurnitureKind,
    name,
    price,
  };
}

/** Screen a raw board: drop unsafe/invalid listings, dedupe by id (last wins — a re-list updates price),
 *  cap the count, and sort by id so the board is deterministic regardless of input order. */
function safeMarket(raw: unknown): Market {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<string, FurnitureListing>();
  for (const e of raw) {
    const ok = safeListing(e);
    if (ok) byId.set(ok.id, ok);
  }
  return [...byId.values()]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, MARKET_LISTINGS_CAP);
}

// ── Pure model ops (node-testable, no DOM) ──────────────────────────────────────

/** All public listings (a defensive copy; already screened). Pure. */
export function allListings(market: Market): Market {
  return market.map((l) => ({ ...l }));
}

/** The listings a given seller has on the board. Pure. */
export function listingsBySeller(
  market: Market,
  sellerCitizenId: string,
): Market {
  return market
    .filter((l) => l.sellerCitizenId === sellerCitizenId)
    .map((l) => ({ ...l }));
}

/** Add (or update) a listing. Rejects an unsafe name / unknown kind / non-positive price by returning the
 *  input unchanged. A re-list of the same design updates its price; the board is capped. Pure. */
export function addListing(
  market: Market,
  sellerCitizenId: string,
  kind: FurnitureKind,
  name: string,
  price: number,
): Market {
  const listing = safeListing({ sellerCitizenId, kind, name, price });
  if (!listing) return market;
  const without = market.filter((l) => l.id !== listing.id);
  // cap only blocks a genuinely NEW listing; updating an existing one is always allowed
  if (without.length === market.length && market.length >= MARKET_LISTINGS_CAP)
    return market;
  return [...without, listing].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
}

/** Remove a listing by id (no-op when absent). Pure. */
export function removeListing(market: Market, id: string): Market {
  return market.filter((l) => l.id !== id);
}

/** Merge restore layers: the backend (when reachable) wins per listing id — the shared cross-device
 *  board — while local fills any listing the backend does not know about. Null backend is a no-op. Pure. */
export function mergeMarkets(local: Market, backend: Market | null): Market {
  if (!backend) return local;
  const byId = new Map<string, FurnitureListing>();
  for (const l of local) byId.set(l.id, l);
  for (const l of backend) byId.set(l.id, l); // backend overrides on a collision
  return [...byId.values()].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
}

// ── LOCAL layer ─────────────────────────────────────────────────────────────────

/** Read the local board. Unsafe/invalid listings are dropped, never returned. */
export function loadMarketLocal(): Market {
  try {
    const raw = localStorage.getItem(LS_MARKET);
    if (!raw) return [];
    return safeMarket(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Persist the whole board locally (screened first). Returns false if storage is unavailable. */
export function saveMarketLocal(market: Market): boolean {
  try {
    localStorage.setItem(LS_MARKET, JSON.stringify(safeMarket(market)));
    return true;
  } catch {
    return false;
  }
}

/** Forget the local board (colony reset). */
export function clearMarketLocal(): void {
  try {
    localStorage.removeItem(LS_MARKET);
  } catch {
    /* no storage */
  }
}

// ── BACKEND layer (best-effort, as the logged-in player) ─────────────────────────

export type BackendSaveResult = { ok: true } | { ok: false; error: string };

/** Best-effort: publish the player's own listings to the shared backend board as the logged-in player.
 *  Never throws, never blocks the game — a 404 just means the kooker-side endpoint has not shipped. */
export async function saveMarketBackend(
  sellerCitizenId: string,
  listings: FurnitureListing[],
): Promise<BackendSaveResult> {
  if (!sellerCitizenId) return { ok: false, error: "no seller" };
  const mine = safeMarket(listings).filter(
    (l) => l.sellerCitizenId === sellerCitizenId,
  );
  const token = await getAuthClient().getValidToken();
  if (!token) return { ok: false, error: "not signed in" };
  try {
    const resp = await fetch(BACKEND_PATH, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sellerCitizenId, listings: mine }),
    });
    return resp.ok ? { ok: true } : { ok: false, error: `HTTP ${resp.status}` };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "network error",
    };
  }
}

/** Best-effort: fetch the shared public board from the backend. Null when signed out, the endpoint is
 *  missing, or the response is malformed — callers fall back to the local board. */
export async function fetchMarketBackend(): Promise<Market | null> {
  const token = await getAuthClient().getValidToken();
  if (!token) return null;
  try {
    const resp = await fetch(BACKEND_PATH, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as unknown;
    // accept either a bare array or a { listings: [...] } envelope
    const arr = Array.isArray(data)
      ? data
      : data && typeof data === "object"
        ? (data as { listings?: unknown }).listings
        : null;
    return arr ? safeMarket(arr) : null;
  } catch {
    return null;
  }
}
