// R3 fix (emmett P0 2026-05-12): generates the "关 LLM 还剩什么" 4-up composite
// PNG (`Documents/demo-cache-screenshots.png`) that the deck references as
// evidence of base-layer-without-LLM. The PNG shows 4 surfaces in a 2×2
// grid: (a) 看典 vault browser (b) PublishPin GB 45438 row (c) 看势 fixture
// trends list (d) FoxRail 9-狐 UI shell. Each remains functional with no
// Kimi/DeepSeek API key set.
//
// Inputs (optional):
//   Documents/imanges/base-layer/vault.png
//   Documents/imanges/base-layer/publish-pin.png
//   Documents/imanges/base-layer/trends.png
//   Documents/imanges/base-layer/foxrail.png
// If any input is missing, generates a labelled placeholder for that quadrant
// (background color + caption) so the composite always exists for the deck.
// Drop real Chrome MCP screenshots into the input dir and re-run to regenerate.
//
// Usage:
//   pnpm tsx scripts/compose-base-layer-png.ts

import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..', '..');
const INPUT_DIR = resolve(REPO_ROOT, 'Documents', 'imanges', 'base-layer');
const OUTPUT_PATH = resolve(REPO_ROOT, 'Documents', 'demo-cache-screenshots.png');

const QUADRANT_W = 960;
const QUADRANT_H = 540;
const PADDING = 12;
const TOTAL_W = QUADRANT_W * 2 + PADDING * 3;
const TOTAL_H = QUADRANT_H * 2 + PADDING * 3 + 80; // 80 for caption strip

interface Quadrant {
  file: string;
  title: string;
  subtitle: string;
  accent: string; // hex bg color for placeholder
}

const QUADRANTS: Quadrant[] = [
  {
    file: 'vault.png',
    title: '看典 · 档案库',
    subtitle: 'BGE-M3 + Qwen3-Reranker 检索 — 无 LLM key 仍可浏览旧稿',
    accent: '#6B5A85', // dian glow approx
  },
  {
    file: 'publish-pin.png',
    title: '发布到知乎 · GB 45438 双签',
    subtitle: 'HMAC + Bearer 已验签 — 标识 + 合规 footer 已写入',
    accent: '#A87B2A',
  },
  {
    file: 'trends.png',
    title: '看势 · 热榜 fixture 兜底',
    subtitle: 'Wi-Fi 断 / API 限流 → fixture cache 1 秒命中',
    accent: '#1772F6',
  },
  {
    file: 'foxrail.png',
    title: '9 狐 UI shell',
    subtitle: 'FoxRail + 顶栏 + 右栏 9 个动作位 — 无 LLM 路径仍可点',
    accent: '#7A6F5A',
  },
];

async function placeholderPng(q: Quadrant): Promise<Buffer> {
  // Minimal SVG → PNG. Bg color from accent, title 28px, subtitle 14px, a
  // tag mark "MOCK · 关 LLM 后" in corner.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${QUADRANT_W}" height="${QUADRANT_H}">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${q.accent}" stop-opacity="0.92" />
        <stop offset="100%" stop-color="${q.accent}" stop-opacity="0.55" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)" />
    <rect x="0" y="0" width="100%" height="100%" fill="#1A1F2A" opacity="0.42" />
    <text x="40" y="${QUADRANT_H / 2 - 10}" font-family="'Noto Serif SC', serif" font-size="34" font-weight="600" fill="#FAF8F3">${q.title}</text>
    <text x="40" y="${QUADRANT_H / 2 + 28}" font-family="'Noto Sans SC', sans-serif" font-size="15" fill="rgba(232,220,196,0.85)">${q.subtitle}</text>
    <text x="40" y="40" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="1.5" fill="rgba(255,255,255,0.55)">PLACEHOLDER · 替换为真实截图后重跑脚本</text>
    <text x="${QUADRANT_W - 200}" y="${QUADRANT_H - 24}" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="1.5" fill="rgba(255,255,255,0.55)">关 LLM · base layer</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function loadQuadrant(q: Quadrant): Promise<Buffer> {
  const filePath = resolve(INPUT_DIR, q.file);
  if (existsSync(filePath)) {
    console.log(`  [OK] ${q.file} (real screenshot)`);
    return sharp(filePath)
      .resize({ width: QUADRANT_W, height: QUADRANT_H, fit: 'cover', position: 'top' })
      .png()
      .toBuffer();
  }
  console.log(`  [=] ${q.file} (placeholder — drop a real screenshot at ${filePath} to replace)`);
  return placeholderPng(q);
}

async function main(): Promise<void> {
  if (!existsSync(INPUT_DIR)) {
    mkdirSync(INPUT_DIR, { recursive: true });
    console.log(`created input dir: ${INPUT_DIR}`);
  }
  console.log(`composing ${QUADRANTS.length} quadrants -> ${OUTPUT_PATH}`);
  console.log('');

  const quadrantBuffers = await Promise.all(QUADRANTS.map(loadQuadrant));

  // Caption strip across the bottom.
  const captionSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL_W}" height="80">
    <rect width="100%" height="100%" fill="#1A1815" />
    <text x="${TOTAL_W / 2}" y="30" text-anchor="middle" font-family="'Noto Serif SC', serif" font-size="20" font-weight="600" fill="#C0B294">关 LLM 还剩什么 — 4 屏 base layer</text>
    <text x="${TOTAL_W / 2}" y="56" text-anchor="middle" font-family="'Noto Sans SC', sans-serif" font-size="12" fill="rgba(168,155,126,0.75)">无 Kimi / DeepSeek key 时：vault 检索 · 双签发布 · 热榜 fixture · 9-狐 UI shell 仍是可用产品</text>
  </svg>`;

  const captionBuffer = await sharp(Buffer.from(captionSvg)).png().toBuffer();

  await sharp({
    create: { width: TOTAL_W, height: TOTAL_H, channels: 4, background: '#0F1117' },
  })
    .composite([
      { input: quadrantBuffers[0], top: PADDING, left: PADDING },
      { input: quadrantBuffers[1], top: PADDING, left: PADDING * 2 + QUADRANT_W },
      { input: quadrantBuffers[2], top: PADDING * 2 + QUADRANT_H, left: PADDING },
      { input: quadrantBuffers[3], top: PADDING * 2 + QUADRANT_H, left: PADDING * 2 + QUADRANT_W },
      { input: captionBuffer, top: PADDING * 3 + QUADRANT_H * 2, left: 0 },
    ])
    .png()
    .toFile(OUTPUT_PATH);

  console.log('');
  console.log(`wrote ${OUTPUT_PATH}`);
  console.log(`  ${TOTAL_W} x ${TOTAL_H} px · 4 quadrants + caption strip`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
