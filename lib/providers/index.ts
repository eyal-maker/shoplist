import { ChainKey } from '../chains';
import type {
  PriceProvider,
  Quote,
  ShoppingListEntry,
} from '../prices';
import { MockPriceProvider } from './mock';
import { ShufersalPriceProvider } from './shufersal';

// Composite provider: routes each (chain, store) pair to a chain-specific
// provider if one is registered, otherwise falls back to the mock provider.
// If a real provider throws, we fall back silently to the mock and flag the
// resulting quote with source='mock'.
class CompositeProvider implements PriceProvider {
  private mock = new MockPriceProvider();
  private perChain: Partial<Record<ChainKey, PriceProvider>> = {};

  constructor() {
    if (process.env.ENABLE_REAL_PRICES === '1') {
      this.perChain.shufersal = new ShufersalPriceProvider();
    }
  }

  async quote(
    chain: ChainKey,
    storeId: string,
    entries: ShoppingListEntry[],
  ): Promise<Quote> {
    const real = this.perChain[chain];
    if (!real) return this.mock.quote(chain, storeId, entries);
    try {
      return await real.quote(chain, storeId, entries);
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn(
          `real provider for ${chain} failed, falling back to mock:`,
          e instanceof Error ? e.message : e,
        );
      }
      return this.mock.quote(chain, storeId, entries);
    }
  }
}

let _provider: PriceProvider | null = null;

export function getPriceProvider(): PriceProvider {
  if (!_provider) _provider = new CompositeProvider();
  return _provider;
}
