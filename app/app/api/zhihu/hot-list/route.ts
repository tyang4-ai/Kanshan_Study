// Server-side proxy for getHotList. Required because the adapter in
// `lib/zhihu.ts` reads `process.env.ZHIHU_API_MODE` + `ZHIHU_ACCESS_SECRET`
// which Next only inlines into client bundles when prefixed `NEXT_PUBLIC_*`.
// Without a server proxy, TrendsTab silently falls back to fixtures in
// production no matter what mode flag we set on Vercel.

import { NextResponse, type NextRequest } from 'next/server';
import { getHotList } from '@/lib/zhihu';
import type { HotListScope } from '@/lib/zhihu/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const scopeParam = req.nextUrl.searchParams.get('scope');
  const scope: HotListScope = scopeParam === 'all' ? 'all' : 'relevant';
  try {
    const items = await getHotList(scope);
    return NextResponse.json({ items, source: process.env.ZHIHU_API_MODE === 'real' ? 'live' : 'mock' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, items: [] }, { status: 502 });
  }
}
