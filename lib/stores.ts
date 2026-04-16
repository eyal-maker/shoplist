import { CHAIN_LIST, ChainKey, matchChain } from './chains';

export type NearbyStore = {
  id: string; // stable id "osm-<type>-<id>"
  chain: ChainKey;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  address?: string;
};

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const aLatR = (aLat * Math.PI) / 180;
  const bLatR = (bLat * Math.PI) / 180;
  const a = s1 * s1 + Math.cos(aLatR) * Math.cos(bLatR) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function buildQuery(lat: number, lng: number, radiusM: number): string {
  return `[out:json][timeout:25];
(
  node["shop"~"supermarket|convenience|grocery"](around:${radiusM},${lat},${lng});
  way["shop"~"supermarket|convenience|grocery"](around:${radiusM},${lat},${lng});
  node["brand"](around:${radiusM},${lat},${lng});
  way["brand"](around:${radiusM},${lat},${lng});
);
out center tags;`;
}

async function callOverpass(query: string): Promise<OverpassElement[]> {
  let lastErr: unknown = null;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        cache: 'no-store',
      });
      if (!res.ok) {
        lastErr = new Error(`Overpass ${url} returned ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { elements?: OverpassElement[] };
      return json.elements ?? [];
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Overpass request failed');
}

export async function findNearbyStores(
  lat: number,
  lng: number,
  limit = 10,
): Promise<NearbyStore[]> {
  // Try expanding radii until we have enough results.
  const radii = [3000, 7000, 15000, 30000];
  const seen = new Map<string, NearbyStore>();

  for (const r of radii) {
    const elements = await callOverpass(buildQuery(lat, lng, r));
    for (const el of elements) {
      const tags = el.tags ?? {};
      const chain = matchChain(
        tags.name,
        tags['name:he'],
        tags['name:en'],
        tags.brand,
        tags['brand:he'],
        tags['brand:en'],
        tags.operator,
      );
      if (!chain) continue;
      const coord =
        el.type === 'node'
          ? { lat: el.lat ?? 0, lng: el.lon ?? 0 }
          : { lat: el.center?.lat ?? 0, lng: el.center?.lon ?? 0 };
      if (!coord.lat || !coord.lng) continue;
      const id = `osm-${el.type}-${el.id}`;
      if (seen.has(id)) continue;
      const name =
        tags['name:he'] ||
        tags.name ||
        tags['name:en'] ||
        CHAIN_LIST.find(c => c.key === chain)!.he;
      const address = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']]
        .filter(Boolean)
        .join(' ');
      seen.set(id, {
        id,
        chain,
        name,
        lat: coord.lat,
        lng: coord.lng,
        distanceKm: haversineKm(lat, lng, coord.lat, coord.lng),
        address: address || undefined,
      });
    }
    if (seen.size >= limit) break;
  }

  return Array.from(seen.values())
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
