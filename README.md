# Shoplist — רשימת קניות חכמה

A Hebrew-first (RTL) shopping-list web app that:

1. Lets the user build and approve a shopping list.
2. On **Go Search**, uses the browser geolocation API to find up to 10 of the
   closest supermarkets belonging to one of the 8 Israeli chains we support.
3. Lets the user pick which of those stores to include, then on
   **Compare Prices** returns the total basket price at each store.

## Supported chains (v1)

1. שופרסל (Shufersal)
2. טיב טעם (Tiv Taam)
3. מחסני השוק (Mahsanei Hashuk)
4. רמי לוי (Rami Levy)
5. קרפור (Carrefour)
6. יוחננוף (Yohananof)
7. אושר עד (Osher Ad)
8. ויקטורי (Victory)

## Stack

- Next.js 14 (App Router) + TypeScript
- Client: single-page React UI (`app/page.tsx`), RTL Hebrew
- Server API routes:
  - `GET /api/stores?lat&lng` — queries OSM Overpass for nearby supermarkets,
    filters by chain brand/name, returns up to 10 closest (no API key required)
  - `POST /api/compare` — returns mock price quotes per store via the
    `PriceProvider` interface

## Price data — what's real vs mocked

This v1 ships with a **mock price provider** (`lib/prices.ts#MockPriceProvider`)
so the full UX is testable without data plumbing. It implements a clean
`PriceProvider` interface, so the next step is to drop in a provider that
ingests Israel's gov-mandated price-transparency XML feeds (חוק מחירים שקופים)
from each chain's public portal.

Everything else is **real**:

- Browser geolocation
- Nearby-store lookup via OpenStreetMap Overpass API
- Item catalog, list building, store selection, comparison UI

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

The geolocation prompt requires HTTPS in production; `localhost` is fine.

## Project layout

```
app/
  layout.tsx           # RTL <html lang="he" dir="rtl">
  page.tsx             # The whole single-page UI
  globals.css
  api/
    stores/route.ts    # Overpass-backed nearby-stores endpoint
    compare/route.ts   # Price comparison endpoint (mock provider)
lib/
  chains.ts            # The 8 supported chains + brand aliases for matching
  catalog.ts           # Seeded item catalog used for v1
  prices.ts            # PriceProvider interface + MockPriceProvider
  stores.ts            # Overpass query + chain-filtering logic
```

## Roadmap

- Replace `MockPriceProvider` with a real ingestor for the chain XML feeds.
- Barcode / free-text item matching against a unified SKU catalog.
- Persist lists per user (auth + DB).
- Map view of nearby stores.
