import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { pickAssetUrl } from '@/lib/art/asset-resolver';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// Dynamic favicon: prefer /public/art/favicon.svg if shipped (served as SVG),
// otherwise render a 32x32 PNG with the 看 char on a warm amber backdrop.
export default async function Icon(): Promise<Response | ImageResponse> {
  const svgUrl = pickAssetUrl('/art/favicon.svg');
  if (svgUrl) {
    const diskPath = join(process.cwd(), 'public', 'art', 'favicon.svg');
    const buffer = readFileSync(diskPath);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
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
          background: '#A89B7E',
          color: '#2A2724',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontFamily: 'serif',
          fontWeight: 700,
        }}
      >
        看
      </div>
    ),
    { ...size },
  );
}
