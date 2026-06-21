// Spec 088 Slice D — the FURNITURE STUDIO economics. A player designs a custom piece (a catalog kind +
// their own name) and BUYS it: the ₭ price moves from their wallet to the studio's till on the in-game
// ledger (mirrored to the real kooker-service-ledger), and the piece lands in their inventory
// (furnitureStore, Slice C). This module is the pure, deterministic price table + the studio account id;
// the wallet debit and inventory record live in runtime.buyFurniture (mirroring buyCommercialShop).
import type { FurnitureKind } from "./furniture";

/** The studio's in-game ledger account (its till) — the counterparty a furniture purchase pays into,
 *  exactly as a land deed pays the `land` office. Mirrored to the real ledger as a treasury wallet. */
export const FURNITURE_SHOP_ACCOUNT = "furniture_shop";

// A deterministic ₭ price per catalog piece: small decor is pocket money, big furniture costs more. These
// sit well under the residential land tier (~160-340 ₭) so a furnished home is affordable on a starter
// deposit, yet a purchase is a real wallet move that conserves on the double-entry ledger.
const PRICE_K: Record<FurnitureKind, number> = {
  rug: 4,
  lamp: 5,
  plant: 5,
  chair: 6,
  table: 10,
  bookshelf: 12,
  desk: 14,
  counter: 16,
  stove: 18,
  sofa: 20,
  bed: 22,
};

/** The ₭ price the studio charges for a piece of the given kind. Pure + deterministic. */
export function furniturePriceK(kind: FurnitureKind): number {
  return PRICE_K[kind] ?? 0;
}
