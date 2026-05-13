import { NextResponse, type NextRequest } from 'next/server';
import { searchZhihu } from '@/lib/zhihu';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'q required', results: [] }, { status: 400 });
  }
  try {
    const results = await searchZhihu(q);
    return NextResponse.json({ results, source: process.env.ZHIHU_API_MODE === 'real' ? 'live' : 'mock' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, results: [] }, { status: 502 });
  }
}
