import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  furniturePriceK,
  FURNITURE_SHOP_ACCOUNT,
} from "../src/colony/furnitureShop";
import { FURNITURE_KINDS } from "../src/colony/furniture";
import {
  LedgerSync,
  moveRef,
  furniturePurchaseBody,
  type LedgerMove,
  type LedgerSyncDeps,
} from "../src/colony/bot/ledgerSync";
import { ColonyRuntime } from "../src/colony/runtime";
import { getLedgerSync } from "../src/colony/bot/ledgerSync";
import {
  loadInventoryLocal,
  nextPurchaseSeq,
  FURNITURE_STACK_CAP,
} from "../src/colony/bot/furnitureStore";

// Spec 088 Slice D — the furniture studio. A player designs a piece (kind + name) and BUYS it: the ₭
// price moves citizen -> studio on the in-game ledger and mirrors to the real ledger, and the piece
// lands in their inventory.

// node has no localStorage — a tiny in-memory shim so furnitureStore (which buyFurniture writes to) works
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

describe("furnitureShop — pricing (spec 088 Slice D)", () => {
  it("prices every catalog kind with a positive, deterministic ₭ amount", () => {
    for (const kind of FURNITURE_KINDS) {
      expect(furniturePriceK(kind)).toBeGreaterThan(0);
      expect(furniturePriceK(kind)).toBe(furniturePriceK(kind));
    }
    // decor is cheaper than big furniture (a stable ordering callers can rely on)
    expect(furniturePriceK("rug")).toBeLessThan(furniturePriceK("bed"));
  });

  it("an unknown kind has no price (0) so it can never be bought", () => {
    expect(furniturePriceK("throne" as never)).toBe(0);
  });
});

describe("furnitureStore — purchase sequence (mirror idempotency)", () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemStorage();
  });

  it("nextPurchaseSeq is monotonic, uncapped, and separate per citizen and design", () => {
    expect(nextPurchaseSeq("citizen_a", "sofa:couch")).toBe(1);
    expect(nextPurchaseSeq("citizen_a", "sofa:couch")).toBe(2);
    // a different design and a different citizen each count independently
    expect(nextPurchaseSeq("citizen_a", "lamp:lamp")).toBe(1);
    expect(nextPurchaseSeq("citizen_b", "sofa:couch")).toBe(1);
    // it does NOT saturate at the held-quantity cap — distinct refs past 99
    for (let i = 3; i <= FURNITURE_STACK_CAP + 2; i++)
      expect(nextPurchaseSeq("citizen_a", "sofa:couch")).toBe(i);
  });
});

describe("furnitureShop — the real-ledger mirror", () => {
  it("furniturePurchaseBody balances (CREDIT citizen == DEBIT studio) and is FURNITURE_PURCHASE", () => {
    const b = furniturePurchaseBody(
      "82",
      "citizen_dax",
      20,
      "citylife:furniture:citizen_dax:sofa:cozy-couch:1",
    );
    expect(b.transactionType).toBe("FURNITURE_PURCHASE");
    expect(b.initiatorId).toBe("82");
    const credit = b.entries.find((e) => e.entryType === "CREDIT")!;
    const debit = b.entries.find((e) => e.entryType === "DEBIT")!;
    expect(credit.ownerId).toBe("citizen_dax");
    expect(debit.ownerId).toBe("furniture_shop");
    expect(credit.amount).toBe(debit.amount); // double-entry balances
  });

  it("moveRef gives repeat buys of the same design distinct, reload-stable references (seq)", () => {
    const mk = (seq: number): LedgerMove => ({
      kind: "furniture_purchase",
      citizenId: "citizen_dax",
      itemId: "sofa:cozy-couch",
      seq,
      amount: 20,
    });
    expect(moveRef(mk(1))).toBe(
      "citylife:furniture:citizen_dax:sofa:cozy-couch:1",
    );
    expect(moveRef(mk(1))).toBe(moveRef(mk(1))); // stable
    expect(moveRef(mk(2))).not.toBe(moveRef(mk(1))); // a second buy is a distinct move
  });

  it("LedgerSync drains a furniture_purchase to /transactions as the player", async () => {
    const sent: { path: string; body: any }[] = [];
    const deps: LedgerSyncDeps = {
      transport: async (path, body) => {
        sent.push({ path, body });
        return { ok: true, status: 200 };
      },
      getToken: async () => "h.eyJ1c2VySWQiOjgyfQ.s",
      getUserId: () => "82",
      storage: null,
    };
    const sync = new LedgerSync(deps);
    sync.notice({
      kind: "furniture_purchase",
      citizenId: "citizen_dax",
      itemId: "sofa:cozy-couch",
      seq: 1,
      amount: 20,
    });
    await sync.drain();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.path).toContain("/transactions");
    expect(sent[0]!.body).toMatchObject({
      transactionType: "FURNITURE_PURCHASE",
      reference: "citylife:furniture:citizen_dax:sofa:cozy-couch:1",
    });
  });
});

describe("runtime.buyFurniture — design + buy (spec 088 Slice D)", () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemStorage();
    vi.restoreAllMocks();
  });

  function richest(rt: ColonyRuntime): string {
    return rt
      .getUiState()
      .citizens.list.map((c) => ({ id: c.id, k: rt.walletK(c.id) }))
      .sort((a, b) => b.k - a.k)[0]!.id;
  }

  it("debits the buyer, credits the studio, conserves the ledger, and records the piece", () => {
    const rt = new ColonyRuntime(42);
    const buyer = richest(rt);
    const price = furniturePriceK("sofa");
    const before = rt.walletK(buyer);
    const shopBefore = Math.round(
      rt.sim.state.ledger.accounts[FURNITURE_SHOP_ACCOUNT] ?? 0,
    );

    expect(rt.buyFurniture(buyer, "sofa", "Cozy Couch")).toBe(true);

    expect(rt.walletK(buyer)).toBe(before - price);
    expect(
      Math.round(rt.sim.state.ledger.accounts[FURNITURE_SHOP_ACCOUNT] ?? 0),
    ).toBe(shopBefore + price);
    const net = Object.values(rt.sim.state.ledger.accounts).reduce(
      (s, v) => s + v,
      0,
    );
    expect(Math.round(net)).toBe(0); // double-entry conserved
    // the piece is in the buyer's inventory (persisted)
    const owned = loadInventoryLocal()[buyer]!;
    expect(owned).toEqual([
      { id: "sofa:cozy-couch", kind: "sofa", name: "Cozy Couch", qty: 1 },
    ]);
  });

  it("mirrors the sale to the real ledger and a repeat buy increments the seq", () => {
    const rt = new ColonyRuntime(42);
    const spy = vi.spyOn(getLedgerSync(), "notice");
    const buyer = richest(rt);
    rt.buyFurniture(buyer, "lamp", "Reading Lamp");
    rt.buyFurniture(buyer, "lamp", "Reading Lamp"); // same design again
    const moves = spy.mock.calls
      .map((c) => c[0] as any)
      .filter(
        (m) =>
          m.kind === "furniture_purchase" && m.itemId === "lamp:reading-lamp",
      );
    expect(moves.map((m) => m.seq)).toEqual([1, 2]); // distinct purchases, not deduped
    expect(rt.walletK(buyer)).toBeGreaterThanOrEqual(0);
  });

  it("a blank name falls back to the kind and is charged + recorded, never banked for free", () => {
    const rt = new ColonyRuntime(42);
    const buyer = richest(rt);
    const price = furniturePriceK("bed");
    const before = rt.walletK(buyer);
    expect(rt.buyFurniture(buyer, "bed", "")).toBe(true); // empty name is not free
    expect(rt.walletK(buyer)).toBe(before - price);
    expect(loadInventoryLocal()[buyer]).toEqual([
      { id: "bed:bed", kind: "bed", name: "bed", qty: 1 },
    ]);
  });

  it("rejects an unaffordable buy, an unknown kind, and an unsafe name — no charge either way", () => {
    const rt = new ColonyRuntime(42);
    const buyer = richest(rt);
    const before = rt.walletK(buyer);
    // a citizen with no wallet cannot buy
    expect(rt.buyFurniture("citizen_nobody", "sofa", "Couch")).toBe(false);
    // an unknown kind has no price
    expect(rt.buyFurniture(buyer, "throne" as never, "Throne")).toBe(false);
    // an unsafe (brand-word) name is screened by furnitureStore — no charge, no record
    expect(rt.buyFurniture(buyer, "sofa", "kooker throne")).toBe(false);
    expect(rt.walletK(buyer)).toBe(before);
    expect(loadInventoryLocal()[buyer]).toBeUndefined();
  });
});
