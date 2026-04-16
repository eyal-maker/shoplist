import { ChainKey, CHAIN_LIST } from './chains';
import { CATALOG_BY_ID } from './catalog';

export type QuoteLine = {
  itemId: string;
  qty: number;
  unitPrice: number | null;
  lineTotal: number | null;
  available: boolean;
};

export type Quote = {
  chain: ChainKey;
  storeId: string;
  lines: QuoteLine[];
  total: number;
  missing: number;
};

export type ShoppingListEntry = { itemId: string; qty: number };

export interface PriceProvider {
  quote(
    chain: ChainKey,
    storeId: string,
    entries: ShoppingListEntry[],
  ): Promise<Quote>;
}

// Deterministic pseudo-random in [0,1) from string hashing. Used by the mock
// provider so a given (chain, store, item) always yields the same price.
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// Mock provider: each chain has a per-chain multiplier band, and each
// (store, item) gets a small deterministic jitter. Occasionally an item is
// "unavailable" at a specific chain/store to exercise the UI.
export class MockPriceProvider implements PriceProvider {
  private chainBias: Record<ChainKey, number>;

  constructor() {
    // Rough, made-up biases so the UI shows differences between chains.
    this.chainBias = {
      ramilevy: 0.92,
      osherad: 0.94,
      mahsanei: 0.96,
      yohananof: 1.0,
      victory: 1.02,
      carrefour: 1.04,
      shufersal: 1.06,
      tivtaam: 1.1,
    };
    // Make sure all chains have a bias (fallback 1.0).
    for (const c of CHAIN_LIST) {
      if (this.chainBias[c.key] === undefined) this.chainBias[c.key] = 1.0;
    }
  }

  async quote(
    chain: ChainKey,
    storeId: string,
    entries: ShoppingListEntry[],
  ): Promise<Quote> {
    const lines: QuoteLine[] = entries.map(e => {
      const item = CATALOG_BY_ID[e.itemId];
      if (!item) {
        return {
          itemId: e.itemId,
          qty: e.qty,
          unitPrice: null,
          lineTotal: null,
          available: false,
        };
      }
      const availRoll = hash01(`${chain}|${storeId}|${e.itemId}|avail`);
      const available = availRoll > 0.04; // ~4% unavailable
      if (!available) {
        return {
          itemId: e.itemId,
          qty: e.qty,
          unitPrice: null,
          lineTotal: null,
          available: false,
        };
      }
      const jitter = 0.9 + hash01(`${chain}|${storeId}|${e.itemId}|price`) * 0.2;
      const raw = item.basePrice * this.chainBias[chain] * jitter;
      const unitPrice = Math.round(raw * 100) / 100;
      const lineTotal = Math.round(unitPrice * e.qty * 100) / 100;
      return { itemId: e.itemId, qty: e.qty, unitPrice, lineTotal, available: true };
    });

    const total = lines.reduce((s, l) => s + (l.lineTotal ?? 0), 0);
    const missing = lines.filter(l => !l.available).length;
    return {
      chain,
      storeId,
      lines,
      total: Math.round(total * 100) / 100,
      missing,
    };
  }
}

export const priceProvider: PriceProvider = new MockPriceProvider();
