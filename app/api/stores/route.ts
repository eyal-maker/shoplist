import { NextRequest, NextResponse } from 'next/server';
import { findNearbyStores } from '@/lib/stores';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit') ?? 10)));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat/lng required' }, { status: 400 });
  }

  try {
    const stores = await findNearbyStores(lat, lng, limit);
    return NextResponse.json({ stores });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
