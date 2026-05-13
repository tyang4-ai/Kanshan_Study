// Cross-device visit-state mirror. Scoped by the per-browser guest cookie
// (`kanshan-guest-id`, set by middleware.ts), so each browser owns one row
// and can never see another browser's row.
//
// Falls back gracefully:
// - 503 if SUPABASE_DB_URL is missing — client keeps localStorage-only.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { visitState } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAccountId } from '@/lib/account';

interface VisitStateBody {
  lastVisits: Array<{ filename: string; topicSnippet: string; at: number }>;
  sessionCount: number;
  crossFoxEventCount: number;
  trendOutboundClicks: number;
}

function hasDb(): boolean {
  return Boolean(process.env.SUPABASE_DB_URL);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!hasDb()) return NextResponse.json({ error: 'db-not-configured' }, { status: 503 });
  const accountId = getAccountId(req);
  try {
    const rows = await db.select().from(visitState).where(eq(visitState.accountId, accountId)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({
        lastVisits: [],
        sessionCount: 0,
        crossFoxEventCount: 0,
        trendOutboundClicks: 0,
        updatedAt: 0,
      });
    }
    const r = rows[0];
    return NextResponse.json({
      lastVisits: r.lastVisits,
      sessionCount: r.sessionCount,
      crossFoxEventCount: r.crossFoxEventCount,
      trendOutboundClicks: r.trendOutboundClicks,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.getTime() : 0,
    });
  } catch (err) {
    // Most likely: visit_state table not migrated to this Supabase instance.
    // Surface as 503 so the client's hydrateFromServer treats it as a soft
    // miss and silently keeps using localStorage — never blocks the UI.
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  if (!hasDb()) return NextResponse.json({ error: 'db-not-configured' }, { status: 503 });
  const accountId = getAccountId(req);
  let body: VisitStateBody;
  try {
    body = (await req.json()) as VisitStateBody;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }
  if (!Array.isArray(body.lastVisits)) {
    return NextResponse.json({ error: 'lastVisits-must-be-array' }, { status: 400 });
  }
  try {
    await db
      .insert(visitState)
      .values({
        accountId,
        lastVisits: body.lastVisits.slice(0, 5),
        sessionCount: Math.max(0, Math.floor(body.sessionCount ?? 0)),
        crossFoxEventCount: Math.max(0, Math.floor(body.crossFoxEventCount ?? 0)),
        trendOutboundClicks: Math.max(0, Math.floor(body.trendOutboundClicks ?? 0)),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: visitState.accountId,
        set: {
          lastVisits: body.lastVisits.slice(0, 5),
          sessionCount: Math.max(0, Math.floor(body.sessionCount ?? 0)),
          crossFoxEventCount: Math.max(0, Math.floor(body.crossFoxEventCount ?? 0)),
          trendOutboundClicks: Math.max(0, Math.floor(body.trendOutboundClicks ?? 0)),
          updatedAt: new Date(),
        },
      });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }
}
