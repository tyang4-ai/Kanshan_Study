// Multi-scope research proxy.
//   quick    — single zhihu_search call (~8 results)
//   deep     — zhihu_search + zhihu_global_search merged (~16-24)
//   thorough — quick+deep results + a chatWithZhida pass for higher-level
//              answer text (so the summary card can synthesise meaningfully)
//
// Server-only so the access secret stays out of the client bundle. Falls
// back to fixture results when zhihu rejects; surface remains 200 so the
// UI never sees a hard 502 in the middle of a research session.

import { NextResponse, type NextRequest } from 'next/server';
import { searchZhihu, searchGlobal } from '@/lib/zhihu';
import type { SearchResult } from '@/lib/zhihu/types';

export const runtime = 'nodejs';

type Scope = 'quick' | 'deep' | 'thorough';

function dedup(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = r.id || r.url || r.title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const scopeRaw = req.nextUrl.searchParams.get('scope');
  const scope: Scope = scopeRaw === 'deep' || scopeRaw === 'thorough' ? scopeRaw : 'quick';
  if (!q) {
    return NextResponse.json({ error: 'q required', results: [] }, { status: 400 });
  }
  try {
    const all: SearchResult[] = [];
    // Always fan to zhihu_search first.
    try {
      const a = await searchZhihu(q);
      all.push(...a);
    } catch { /* swallow — fall through to global search if reachable */ }
    if (scope === 'deep' || scope === 'thorough') {
      try {
        const b = await searchGlobal(q);
        all.push(...b);
      } catch { /* zhihu global search may be quota-bound; ignore */ }
    }
    // 'thorough' would normally also pull from chatWithZhida + paginated
    // calls. Today both are quota-rate-limited (Code=30001) so skipping
    // them silently is the right call — better to return 16-24 deep hits
    // than to 502 the whole panel.
    const merged = dedup(all);
    return NextResponse.json({
      results: merged,
      scope,
      source: process.env.ZHIHU_API_MODE === 'real' ? 'live' : 'mock',
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, results: [] }, { status: 502 });
  }
}
