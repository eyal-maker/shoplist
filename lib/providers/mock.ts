import { ChainKey, CHAIN_LIST } from '../chains';
import { CATALOG_BY_ID } from '../catalog';
import type {
  PriceProvider,
  Quote,
  QuoteLine,
  ShoppingListEntry,
} from '../prices';

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// Deterministic mock prices. Each chain has a rough multiplier and each
// (store, item) pair gets a small jitter so numbers differ visibly but
// stably.
export class MockPriceProvider implements PriceProvider {
  private chainBias: Record<ChainKey, number>;

  constructor() {
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
      const available = availRoll > 0.04;
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
      source: 'mock',
    };
  }
}
