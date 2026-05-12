import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { pickAssetUrl } from '@/lib/art/asset-resolver';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = '看山书房 · 灵感激发 · 思路梳理 · 内容精加工';

// Static OG image: prefer a pre-painted /public/art/og.png if shipped,
// otherwise render a typographic fallback via next/og's ImageResponse.
export default async function OpenGraphImage(): Promise<Response | ImageResponse> {
  const ogUrl = pickAssetUrl('/art/og.png');
  if (ogUrl) {
    const diskPath = join(process.cwd(), 'public', 'art', 'og.png');
    const buffer = readFileSync(diskPath);
    // Cast to BodyInit-compatible ArrayBuffer view.
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    });
  }
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#2A2724',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
        }}
      >
        <div style={{ fontSize: 88, color: '#A89B7E', fontFamily: 'serif' }}>看山书房</div>
        <div style={{ fontSize: 28, color: '#F5EAD0', marginTop: 24 }}>
          灵感激发 · 思路梳理 · 内容精加工
        </div>
      </div>
    ),
    { ...size },
  );
}
