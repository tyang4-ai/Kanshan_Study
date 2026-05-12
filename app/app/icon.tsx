import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { pickAssetUrl } from '@/lib/art/asset-resolver';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// Dynamic favicon: prefer /public/art/favicon.png (Gemini-generated, Phase #16.5),
// then /public/art/favicon.svg, then render a typographic fallback.
export default async function Icon(): Promise<Response | ImageResponse> {
  const pngUrl = pickAssetUrl('/art/favicon.png');
  if (pngUrl) {
    const diskPath = join(process.cwd(), 'public', 'art', 'favicon.png');
    const buffer = readFileSync(diskPath);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    });
  }
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
