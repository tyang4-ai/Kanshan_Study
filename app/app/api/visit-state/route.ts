// R3 fix (李笛 / 徐诗 P1 2026-05-12): cross-device visit-state mirror.
// Client pushes a debounced snapshot every ~30s; pulls on mount if server
// state is newer. Auth-gated by the existing cookie-sign session (zhihu OAuth,
// shipped in R2 fix-pass) so anonymous users can't trample each other's data.
//
// Falls back gracefully:
// - 401 if no session cookie — client keeps localStorage-only.
// - 503 if SUPABASE_DB_URL is missing — same fallback (degraded == working).

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { visitState } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/auth/cookie-sign';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'kanshan_zhihu_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface SessionPayload {
  uid: string;
  exp?: number;
}

interface VisitStateBody {
  lastVisits: Array<{ filename: string; topicSnippet: string; at: number }>;
  sessionCount: number;
  crossFoxEventCount: number;
  trendOutboundClicks: number;
}

async function getAccountId(): Promise<string | null> {
  const secret = process.env.SESSION_SIGNING_SECRET;
  if (!secret) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifySession<SessionPayload>(token, secret, { maxAgeSeconds: MAX_AGE_SECONDS });
  return payload?.uid ?? null;
}

function hasDb(): boolean {
  return Boolean(process.env.SUPABASE_DB_URL);
}

export async function GET(): Promise<NextResponse> {
  if (!hasDb()) return NextResponse.json({ error: 'db-not-configured' }, { status: 503 });
  const accountId = await getAccountId();
  if (!accountId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  if (!hasDb()) return NextResponse.json({ error: 'db-not-configured' }, { status: 503 });
  const accountId = await getAccountId();
  if (!accountId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: VisitStateBody;
  try {
    body = (await req.json()) as VisitStateBody;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }
  // Soft validation — the schema is small, no Zod for the MVP path.
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
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
