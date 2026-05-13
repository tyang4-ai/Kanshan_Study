import { NextResponse } from 'next/server';
import { getFollowingFeed } from '@/lib/zhihu';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  try {
    const page = await getFollowingFeed();
    return NextResponse.json({ page, source: process.env.ZHIHU_API_MODE === 'real' ? 'live' : 'mock' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, page: { items: [] } }, { status: 502 });
  }
}
