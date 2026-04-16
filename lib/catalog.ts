export type CatalogItem = {
  id: string;
  he: string;
  unit: 'יח׳' | 'ק״ג' | 'ליטר' | 'חבילה';
  // Baseline price in ILS used by the mock price provider.
  basePrice: number;
};

// Small seeded catalog for v1. Each item has a stable id used for matching
// against the (future) real price feeds.
export const CATALOG: CatalogItem[] = [
  { id: 'milk-3pct-1l', he: 'חלב 3% ליטר', unit: 'יח׳', basePrice: 6.4 },
  { id: 'bread-white', he: 'לחם אחיד פרוס', unit: 'יח׳', basePrice: 7.2 },
  { id: 'eggs-l-12', he: 'ביצים L תריסר', unit: 'חבילה', basePrice: 18.9 },
  { id: 'cottage-250', he: 'קוטג׳ 5% 250 גרם', unit: 'יח׳', basePrice: 7.5 },
  { id: 'yellow-cheese-200', he: 'גבינה צהובה 200 גרם', unit: 'חבילה', basePrice: 19.9 },
  { id: 'tomato', he: 'עגבניות', unit: 'ק״ג', basePrice: 7.9 },
  { id: 'cucumber', he: 'מלפפונים', unit: 'ק״ג', basePrice: 6.9 },
  { id: 'potato', he: 'תפוחי אדמה', unit: 'ק״ג', basePrice: 4.9 },
  { id: 'onion', he: 'בצל יבש', unit: 'ק״ג', basePrice: 3.9 },
  { id: 'banana', he: 'בננה', unit: 'ק״ג', basePrice: 8.9 },
  { id: 'apple-red', he: 'תפוח עץ אדום', unit: 'ק״ג', basePrice: 9.9 },
  { id: 'chicken-breast', he: 'חזה עוף טרי', unit: 'ק״ג', basePrice: 42.9 },
  { id: 'rice-1kg', he: 'אורז לבן ק״ג', unit: 'חבילה', basePrice: 11.9 },
  { id: 'pasta-500', he: 'פסטה 500 גרם', unit: 'חבילה', basePrice: 6.5 },
  { id: 'olive-oil-750', he: 'שמן זית 750 מ״ל', unit: 'יח׳', basePrice: 39.9 },
  { id: 'sugar-1kg', he: 'סוכר ק״ג', unit: 'חבילה', basePrice: 5.9 },
  { id: 'flour-1kg', he: 'קמח ק״ג', unit: 'חבילה', basePrice: 4.9 },
  { id: 'salt-1kg', he: 'מלח ק״ג', unit: 'חבילה', basePrice: 3.9 },
  { id: 'coke-1.5l', he: 'קוקה קולה 1.5 ליטר', unit: 'יח׳', basePrice: 8.9 },
  { id: 'water-6pk', he: 'מים מינרליים שישייה', unit: 'חבילה', basePrice: 13.9 },
  { id: 'toilet-paper-32', he: 'נייר טואלט 32 גלילים', unit: 'חבילה', basePrice: 49.9 },
  { id: 'dish-soap', he: 'סבון כלים', unit: 'יח׳', basePrice: 12.9 },
];

export const CATALOG_BY_ID: Record<string, CatalogItem> = Object.fromEntries(
  CATALOG.map(c => [c.id, c]),
);
