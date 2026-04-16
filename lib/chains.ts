export type ChainKey =
  | 'shufersal'
  | 'tivtaam'
  | 'mahsanei'
  | 'ramilevy'
  | 'carrefour'
  | 'yohananof'
  | 'osherad'
  | 'victory';

export type ChainInfo = {
  key: ChainKey;
  he: string;
  en: string;
  // Lowercase substrings to match against OSM name/brand/operator tags.
  aliases: string[];
  color: string;
};

export const CHAINS: Record<ChainKey, ChainInfo> = {
  shufersal: {
    key: 'shufersal',
    he: 'שופרסל',
    en: 'Shufersal',
    aliases: ['שופרסל', 'shufersal'],
    color: '#e30613',
  },
  tivtaam: {
    key: 'tivtaam',
    he: 'טיב טעם',
    en: 'Tiv Taam',
    aliases: ['טיב טעם', 'tiv taam', 'tivtaam', 'tiv-taam'],
    color: '#006341',
  },
  mahsanei: {
    key: 'mahsanei',
    he: 'מחסני השוק',
    en: 'Mahsanei Hashuk',
    aliases: ['מחסני השוק', 'mahsanei', 'machsanei', 'mahsane'],
    color: '#f6a800',
  },
  ramilevy: {
    key: 'ramilevy',
    he: 'רמי לוי',
    en: 'Rami Levy',
    aliases: ['רמי לוי', 'rami levy', 'ramilevy', 'rami-levy'],
    color: '#ed1c24',
  },
  carrefour: {
    key: 'carrefour',
    he: 'קרפור',
    en: 'Carrefour',
    aliases: ['קרפור', 'carrefour'],
    color: '#0046be',
  },
  yohananof: {
    key: 'yohananof',
    he: 'יוחננוף',
    en: 'Yohananof',
    aliases: ['יוחננוף', 'yohananof', 'yohanananof'],
    color: '#2e8b57',
  },
  osherad: {
    key: 'osherad',
    he: 'אושר עד',
    en: 'Osher Ad',
    aliases: ['אושר עד', 'osher ad', 'osherad', 'osher-ad'],
    color: '#7b2cbf',
  },
  victory: {
    key: 'victory',
    he: 'ויקטורי',
    en: 'Victory',
    aliases: ['ויקטורי', 'victory'],
    color: '#c1121f',
  },
};

export const CHAIN_LIST: ChainInfo[] = Object.values(CHAINS);

export function matchChain(...fields: (string | undefined | null)[]): ChainKey | null {
  const hay = fields
    .filter((f): f is string => !!f)
    .map(f => f.toLowerCase())
    .join(' | ');
  for (const chain of CHAIN_LIST) {
    for (const alias of chain.aliases) {
      if (hay.includes(alias.toLowerCase())) return chain.key;
    }
  }
  return null;
}
