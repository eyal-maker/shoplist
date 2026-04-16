import { gunzipSync } from 'node:zlib';
import { XMLParser } from 'fast-xml-parser';
import { ChainKey } from '../chains';
import { CATALOG, CATALOG_BY_ID } from '../catalog';
import type {
  PriceProvider,
  Quote,
  QuoteLine,
  ShoppingListEntry,
} from '../prices';

// Shufersal publishes the government-mandated transparency feeds on an
// unauthenticated public portal.
//   Listing:   https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=2
//   The HTML lists gzipped XML files (PriceFull-<storeId>-<ts>.gz).
//
// For v1 we pick the first listed PriceFull file (any branch) and use those
// prices as the chain-wide prices for Shufersal. Mapping OSM store ids to
// Shufersal branch ids is a follow-up (requires geocoding StoresFull.xml).
const PORTAL_LIST_URL =
  'https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=2';

type ShufersalItem = {
  barcode: string;
  name: string;
  price: number;
};

type Index = {
  fetchedAt: number;
  items: ShufersalItem[];
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

export class ShufersalPriceProvider implements PriceProvider {
  private index: Index | null = null;
  private loadingPromise: Promise<Index> | null = null;

  async quote(
    chain: ChainKey,
    storeId: string,
    entries: ShoppingListEntry[],
  ): Promise<Quote> {
    if (chain !== 'shufersal') {
      throw new Error(`ShufersalPriceProvider cannot quote chain=${chain}`);
    }

    const index = await this.getIndex();

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
      const match = findCheapestMatch(index.items, item.keywords);
      if (!match) {
        return {
          itemId: e.itemId,
          qty: e.qty,
          unitPrice: null,
          lineTotal: null,
          available: false,
        };
      }
      const unitPrice = Math.round(match.price * 100) / 100;
      const lineTotal = Math.round(unitPrice * e.qty * 100) / 100;
      return {
        itemId: e.itemId,
        qty: e.qty,
        unitPrice,
        lineTotal,
        available: true,
        matchedName: match.name,
        matchedBarcode: match.barcode,
      };
    });

    const total = lines.reduce((s, l) => s + (l.lineTotal ?? 0), 0);
    const missing = lines.filter(l => !l.available).length;
    return {
      chain,
      storeId,
      lines,
      total: Math.round(total * 100) / 100,
      missing,
      source: 'live',
    };
  }

  private async getIndex(): Promise<Index> {
    const now = Date.now();
    if (this.index && now - this.index.fetchedAt < CACHE_TTL_MS) return this.index;
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = (async () => {
      const idx = await loadShufersalIndex();
      this.index = idx;
      this.loadingPromise = null;
      return idx;
    })();
    return this.loadingPromise;
  }
}

async function loadShufersalIndex(): Promise<Index> {
  const listingHtml = await fetchText(PORTAL_LIST_URL);
  const fileUrl = extractFirstPriceFullUrl(listingHtml);
  if (!fileUrl) {
    throw new Error('could not find a PriceFull file in Shufersal listing');
  }
  const buf = await fetchBinary(fileUrl);
  const xml = gunzipSync(buf).toString('utf-8');
  const items = parsePriceFullXml(xml);
  return { fetchedAt: Date.now(), items };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'shoplist/0.1 (+https://example.invalid)' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

async function fetchBinary(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'shoplist/0.1 (+https://example.invalid)' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function extractFirstPriceFullUrl(html: string): string | null {
  // The listing HTML renders download links like:
  //   <a href="https://pricesprodpublic.blob.core.windows.net/.../PriceFull...gz?sv=...">Download</a>
  // We just grab the first absolute URL containing "PriceFull" and ".gz".
  const re = /https?:\/\/[^"'\s<>]+PriceFull[^"'\s<>]*\.gz[^"'\s<>]*/i;
  const m = html.match(re);
  return m ? m[0] : null;
}

function parsePriceFullXml(xml: string): ShufersalItem[] {
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: true,
    trimValues: true,
  });
  const root = parser.parse(xml) as Record<string, unknown>;
  // The root element name varies ("root"/"Root"/"Prices"); find the first
  // descendant that has an Items->Item structure.
  const items = findItems(root);
  const out: ShufersalItem[] = [];
  for (const raw of items) {
    const barcode = String(raw.ItemCode ?? '').trim();
    const name = String(raw.ItemName ?? '').trim();
    const price = Number(raw.ItemPrice);
    if (!name || !Number.isFinite(price) || price <= 0) continue;
    out.push({ barcode, name, price });
  }
  return out;
}

function findItems(node: unknown): Record<string, unknown>[] {
  if (!node || typeof node !== 'object') return [];
  const obj = node as Record<string, unknown>;
  const items = obj.Items as Record<string, unknown> | undefined;
  if (items && items.Item) {
    const arr = Array.isArray(items.Item) ? items.Item : [items.Item];
    return arr as Record<string, unknown>[];
  }
  for (const v of Object.values(obj)) {
    const found = findItems(v);
    if (found.length) return found;
  }
  return [];
}

function findCheapestMatch(
  items: ShufersalItem[],
  keywords: string[],
): ShufersalItem | null {
  if (keywords.length === 0) return null;
  const kws = keywords.map(k => k.toLowerCase());
  let best: ShufersalItem | null = null;
  for (const it of items) {
    const hay = norm(it.name);
    let ok = true;
    for (const kw of kws) {
      if (!hay.includes(kw)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    if (!best || it.price < best.price) best = it;
  }
  return best;
}

// Exported for tests / debugging.
export const _internal = {
  extractFirstPriceFullUrl,
  parsePriceFullXml,
  findCheapestMatch,
};

// Satisfy an import so CATALOG stays as a typecheck anchor for this file.
export const _catalogRefCount = CATALOG.length;
