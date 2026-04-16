import { NextRequest, NextResponse } from 'next/server';
import { getPriceProvider, ShoppingListEntry } from '@/lib/prices';
import { ChainKey } from '@/lib/chains';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CompareRequest = {
  entries: ShoppingListEntry[];
  stores: { id: string; chain: ChainKey }[];
};

export async function POST(req: NextRequest) {
  let body: CompareRequest;
  try {
    body = (await req.json()) as CompareRequest;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!Array.isArray(body.entries) || !Array.isArray(body.stores)) {
    return NextResponse.json({ error: 'entries and stores required' }, { status: 400 });
  }

  const provider = getPriceProvider();
  const quotes = await Promise.all(
    body.stores.map(s => provider.quote(s.chain, s.id, body.entries)),
  );
  return NextResponse.json({ quotes });
}
