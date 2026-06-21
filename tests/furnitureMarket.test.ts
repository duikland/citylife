import { describe, it, expect, beforeEach } from "vitest";
import {
  listingId,
  addListing,
  removeListing,
  allListings,
  listingsBySeller,
  mergeMarkets,
  loadMarketLocal,
  saveMarketLocal,
  clearMarketLocal,
  MARKET_LISTINGS_CAP,
  type Market,
} from "../src/colony/bot/furnitureMarket";
import {
  ownedFurnitureId,
  recordOwnedLocal,
} from "../src/colony/bot/furnitureStore";
import { furniturePriceK } from "../src/colony/furnitureShop";
import { ColonyRuntime } from "../src/colony/runtime";

// Spec 088 Slice F — the Kookerbook furniture marketplace. Public, screened, two-layer listing board.

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}

describe("furnitureMarket — pure model ops (spec 088 Slice F)", () => {
  it("listingId embeds the inventory itemId so the two cross-reference", () => {
    expect(listingId("citizen_a", "sofa", "Cozy Couch")).toBe(
      `citizen_a:${ownedFurnitureId("sofa", "Cozy Couch")}`,
    );
    expect(listingId("citizen_a", "sofa", "Cozy Couch")).toBe(
      "citizen_a:sofa:cozy-couch",
    );
  });

  it("addListing adds, dedupes per seller+design, and a re-list updates the price", () => {
    let m: Market = [];
    m = addListing(m, "citizen_a", "sofa", "Cozy Couch", 20);
    m = addListing(m, "citizen_a", "lamp", "Reading Lamp", 5);
    m = addListing(m, "citizen_a", "sofa", "Cozy Couch", 25); // re-list -> price update, no dupe
    expect(m.map((l) => l.id)).toEqual([
      "citizen_a:lamp:reading-lamp",
      "citizen_a:sofa:cozy-couch",
    ]);
    expect(m.find((l) => l.id === "citizen_a:sofa:cozy-couch")!.price).toBe(25);
  });

  it("two sellers can list the same design independently", () => {
    let m: Market = [];
    m = addListing(m, "citizen_a", "bed", "Bunk", 22);
    m = addListing(m, "citizen_b", "bed", "Bunk", 22);
    expect(m).toHaveLength(2);
    expect(listingsBySeller(m, "citizen_a")).toHaveLength(1);
  });

  it("addListing REFUSES an unsafe name, an unknown kind and a non-positive price", () => {
    let m: Market = [];
    m = addListing(m, "citizen_a", "sofa", "kooker couch", 20); // brand word
    m = addListing(m, "citizen_a", "throne" as never, "Throne", 20); // bad kind
    m = addListing(m, "citizen_a", "rug", "Rug", 0); // non-positive price
    expect(m).toEqual([]);
  });

  it("caps the board but still lets an existing listing update past the cap", () => {
    let m: Market = [];
    for (let i = 0; i < MARKET_LISTINGS_CAP; i++)
      m = addListing(m, `citizen_${i}`, "lamp", "Lamp", 5);
    expect(m).toHaveLength(MARKET_LISTINGS_CAP);
    // a brand-new seller's listing is dropped (full)
    const full = addListing(m, "citizen_new", "bed", "Bed", 22);
    expect(full).toHaveLength(MARKET_LISTINGS_CAP);
    // but updating one already on the board is allowed
    const updated = addListing(m, "citizen_0", "lamp", "Lamp", 6);
    expect(updated).toHaveLength(MARKET_LISTINGS_CAP);
    expect(updated.find((l) => l.id === "citizen_0:lamp:lamp")!.price).toBe(6);
  });

  it("removeListing drops by id; mergeMarkets lets the backend win per id", () => {
    let m: Market = [];
    m = addListing(m, "citizen_a", "sofa", "Couch", 20);
    m = addListing(m, "citizen_b", "bed", "Bed", 22);
    expect(removeListing(m, "citizen_a:sofa:couch")).toHaveLength(1);
    const backend: Market = [
      {
        id: "citizen_b:bed:bed",
        sellerCitizenId: "citizen_b",
        kind: "bed",
        name: "Bed",
        price: 30,
      },
    ];
    const merged = mergeMarkets(m, backend);
    expect(merged.find((l) => l.id === "citizen_b:bed:bed")!.price).toBe(30); // backend wins
    expect(merged.find((l) => l.id === "citizen_a:sofa:couch")).toBeTruthy(); // local kept
    expect(mergeMarkets(m, null)).toEqual(m);
  });

  it("allListings returns a defensive copy", () => {
    const m = addListing([], "citizen_a", "rug", "Rug", 4);
    const copy = allListings(m);
    copy[0]!.price = 999;
    expect(m[0]!.price).toBe(4);
  });
});

describe("furnitureMarket — local persistence + safety", () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemStorage();
  });

  it("round-trips the board through localStorage and clear wipes it", () => {
    saveMarketLocal(addListing([], "citizen_a", "sofa", "Couch", 20));
    expect(loadMarketLocal()).toEqual([
      {
        id: "citizen_a:sofa:couch",
        sellerCitizenId: "citizen_a",
        kind: "sofa",
        name: "Couch",
        price: 20,
      },
    ]);
    clearMarketLocal();
    expect(loadMarketLocal()).toEqual([]);
  });

  it("drops corrupt / unsafe listings on LOAD — tampering cannot reach the board", () => {
    (
      globalThis as unknown as { localStorage: MemStorage }
    ).localStorage.setItem(
      "citylife.furniture.market.v1",
      JSON.stringify([
        {
          id: "x",
          sellerCitizenId: "a",
          kind: "throne",
          name: "Throne",
          price: 5,
        }, // bad kind
        {
          id: "y",
          sellerCitizenId: "a",
          kind: "sofa",
          name: "kooker couch",
          price: 5,
        }, // unsafe
        {
          id: "z",
          sellerCitizenId: "a",
          kind: "bed",
          name: "Real Bed",
          price: 22,
        }, // good
      ]),
    );
    expect(loadMarketLocal()).toEqual([
      {
        id: "a:bed:real-bed",
        sellerCitizenId: "a",
        kind: "bed",
        name: "Real Bed",
        price: 22,
      },
    ]);
  });
});

describe("runtime — marketplace wiring (spec 088 Slice F)", () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemStorage();
  });

  function richest(rt: ColonyRuntime): string {
    return rt
      .getUiState()
      .citizens.list.map((c) => ({ id: c.id, k: rt.walletK(c.id) }))
      .sort((a, b) => b.k - a.k)[0]!.id;
  }

  it("lists only a design the seller owns, at the studio price", () => {
    const rt = new ColonyRuntime(42);
    const seller = richest(rt);
    // cannot list what you do not own
    expect(rt.listFurnitureForSale(seller, "bed", "Phantom")).toBe(false);
    expect(rt.marketListings()).toEqual([]);
    // own it, then list it
    recordOwnedLocal(seller, "sofa", "Cozy Couch", 1);
    expect(rt.listFurnitureForSale(seller, "sofa", "Cozy Couch")).toBe(true);
    const board = rt.marketListings();
    expect(board).toHaveLength(1);
    expect(board[0]).toMatchObject({
      sellerCitizenId: seller,
      kind: "sofa",
      name: "Cozy Couch",
      price: furniturePriceK("sofa"),
    });
  });

  it("only the seller can unlist their listing", () => {
    const rt = new ColonyRuntime(42);
    const seller = richest(rt);
    recordOwnedLocal(seller, "lamp", "Lamp", 1);
    rt.listFurnitureForSale(seller, "lamp", "Lamp");
    const id = rt.marketListings()[0]!.id;
    // a different citizen cannot remove it
    expect(rt.unlistFurniture("citizen_someone_else", id)).toBe(false);
    expect(rt.marketListings()).toHaveLength(1);
    // the seller can
    expect(rt.unlistFurniture(seller, id)).toBe(true);
    expect(rt.marketListings()).toEqual([]);
  });

  it("buyFromMarket gives the buyer their own copy from the studio and leaves the listing up", () => {
    const rt = new ColonyRuntime(42);
    const seller = richest(rt);
    recordOwnedLocal(seller, "table", "Oak Table", 1);
    rt.listFurnitureForSale(seller, "table", "Oak Table");
    const id = rt.marketListings()[0]!.id;

    const before = rt.walletK(seller);
    expect(rt.buyFromMarket(seller, id)).toBe(true); // the seller buys another copy here
    // charged the studio price, and the listing remains advertised
    expect(rt.walletK(seller)).toBe(before - furniturePriceK("table"));
    expect(rt.marketListings().some((l) => l.id === id)).toBe(true);
    // a missing listing is refused
    expect(rt.buyFromMarket(seller, "nobody:bed:bed")).toBe(false);
  });
});
