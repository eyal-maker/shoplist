import { ChainKey } from './chains';

export type QuoteLine = {
  itemId: string;
  qty: number;
  unitPrice: number | null;
  lineTotal: number | null;
  available: boolean;
  // Optional: the matched chain-internal item name/barcode. Present when a
  // real-data provider returned this line.
  matchedName?: string;
  matchedBarcode?: string;
};

export type Quote = {
  chain: ChainKey;
  storeId: string;
  lines: QuoteLine[];
  total: number;
  missing: number;
  // 'mock' vs 'live'. Lets the UI indicate which source produced the numbers.
  source: 'mock' | 'live';
};

export type ShoppingListEntry = { itemId: string; qty: number };

export interface PriceProvider {
  quote(
    chain: ChainKey,
    storeId: string,
    entries: ShoppingListEntry[],
  ): Promise<Quote>;
}

export { getPriceProvider } from './providers';
