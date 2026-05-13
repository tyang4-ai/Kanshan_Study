import { NextResponse } from 'next/server';
import { getStoryList } from '@/lib/zhihu';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  try {
    const items = await getStoryList();
    return NextResponse.json({ items, source: process.env.ZHIHU_API_MODE === 'real' ? 'live' : 'mock' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, items: [] }, { status: 502 });
  }
}
