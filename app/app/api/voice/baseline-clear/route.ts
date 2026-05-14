// r5 TASK H (周源 R4 standing P1): "一键清空" affordance behind the
// VoiceDiffPanel disclaimer line. The baseline cache is per-session +
// per-user; this route clears it so a privacy-conscious user can stop
// 看墨 from grounding the next polish call against their existing samples.
//
// We don't actually persist user-specific baselines on the server right now
// (loadBaseline reads from the bundled voice-fingerprint corpus); this route
// exists so the UI affordance is honest. When real user-corpus storage is
// added in a future migration, the body of this route is where it gets wiped.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(): Promise<NextResponse> {
  // No-op against current architecture. Returns OK so the UI toast fires
  // as intended; once per-user baseline storage exists, delete here.
  return NextResponse.json({ ok: true, cleared: 0 });
}
