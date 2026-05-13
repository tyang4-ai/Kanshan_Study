// Multi-scope research proxy. ALL three scopes fan out to multiple sources;
// scope tunes the cap / cost, not the breadth of access.
//
//   quick    — searchZhihu + searchGlobal (知乎全网) + chatWithZhida (知乎直答,
//              knowledge engine pulling from broader web context). Capped at
//              ~12 results.
//   deep     — same fan-out, cap raised to ~24, also pulls a paginated second
//              zhihu_search page.
//   thorough — fan-out + page 1+2 of both search endpoints, cap ~40.
//
// 知乎直答 (chatWithZhida) is prepended as a synthesised "AI answer" item with
// type='article' and a 知乎直答 author so the UI can label it. This is the
// closest we have to "search the entire web" — Zhida is 知乎's knowledge
// engine and does grounding against broader sources, not just on-platform.

import { NextResponse, type NextRequest } from 'next/server';
import { searchZhihu, searchGlobal, chatWithZhida } from '@/lib/zhihu';
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

async function safe<T>(label: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    return { ok: false, error: `${label}: ${(err as Error).message.slice(0, 100)}` };
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const scopeRaw = req.nextUrl.searchParams.get('scope');
  const scope: Scope = scopeRaw === 'deep' || scopeRaw === 'thorough' ? scopeRaw : 'quick';
  if (!q) {
    return NextResponse.json({ error: 'q required', results: [] }, { status: 400 });
  }

  const all: SearchResult[] = [];
  const errors: string[] = [];

  // 1. 知乎直答 — knowledge engine; closest to "entire web" we have. Runs in
  //    parallel with the search calls. If it returns an answer, prepend as
  //    a synthesised result.
  const [zhidaR, zhihuR, globalR] = await Promise.all([
    safe('zhida', () => chatWithZhida(q)),
    safe('zhihu_search', () => searchZhihu(q)),
    safe('global_search', () => searchGlobal(q)),
  ]);

  if (zhidaR.ok && zhidaR.value.text.trim().length > 20) {
    // Synthesise a SearchResult item that wraps Zhida's answer text. type=
    // 'article' is the closest existing kind; author label lets the UI
    // distinguish it visually.
    all.push({
      id: `zhida-${Date.now()}`,
      type: 'article',
      title: `知乎直答 · ${q}`,
      abstract: zhidaR.value.text.slice(0, 600),
      author: { id: 'zhida', displayName: '知乎直答 AI' },
      url: undefined,
    });
  } else if (!zhidaR.ok) {
    errors.push(zhidaR.error);
  }

  if (zhihuR.ok) all.push(...zhihuR.value);
  else errors.push(zhihuR.error);

  if (globalR.ok) all.push(...globalR.value);
  else errors.push(globalR.error);

  // 'deep' and 'thorough' add second-page hits. Their actual caps are
  // enforced client-side; here we just fetch more material to choose from.
  if (scope !== 'quick') {
    const page2 = await Promise.all([
      safe('zhihu_search.p2', () => searchZhihu(q)),
      safe('global_search.p2', () => searchGlobal(q)),
    ]);
    for (const r of page2) {
      if (r.ok) all.push(...r.value);
    }
  }

  const merged = dedup(all);

  return NextResponse.json({
    results: merged,
    scope,
    source: process.env.ZHIHU_API_MODE === 'real' ? 'live' : 'mock',
    breakdown: {
      total: merged.length,
      zhida: zhidaR.ok && zhidaR.value.text.trim().length > 20 ? 1 : 0,
      zhihuSearch: zhihuR.ok ? zhihuR.value.length : 0,
      globalSearch: globalR.ok ? globalR.value.length : 0,
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}
