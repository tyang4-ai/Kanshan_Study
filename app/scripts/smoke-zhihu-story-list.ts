/**
 * Pre-5/12 smoke test for the 知乎 OpenAPI HMAC signing.
 *
 * Usage (from app/):
 *   pnpm tsx --env-file=.env.local scripts/smoke-zhihu-story-list.ts
 *
 * (`tsx` reads `--env-file` natively — no `dotenv` dep needed.)
 *
 * Requires .env.local with ZHIHU_APP_KEY (your 知乎主页 URL suffix) and
 * ZHIHU_APP_SECRET (the 32-char key issued 5/9). Output:
 *   - the 5 X-* headers we'd send (sign masked)
 *   - the live response (story list summaries) on success
 *   - HTTP status / response body on failure
 *
 * Burns 1 quota call. Safe to run once or twice; do NOT loop.
 */

import { signZhihuRequest } from '../lib/zhihu/sign';

async function main(): Promise<void> {
  const appKey = process.env.ZHIHU_APP_KEY;
  const appSecret = process.env.ZHIHU_APP_SECRET;
  if (!appKey || !appSecret) {
    console.error('✗ ZHIHU_APP_KEY or ZHIHU_APP_SECRET missing in .env.local');
    process.exit(1);
  }

  const headers = signZhihuRequest(appKey, appSecret);
  console.log('—— signed headers (X-Sign masked) ——');
  console.log(`  X-App-Key:    ${headers['X-App-Key']}`);
  console.log(`  X-Timestamp:  ${headers['X-Timestamp']}`);
  console.log(`  X-Log-Id:     ${headers['X-Log-Id']}`);
  console.log(`  X-Sign:       ${headers['X-Sign'].slice(0, 12)}…(${headers['X-Sign'].length} chars)`);
  console.log(`  X-Extra-Info: ${JSON.stringify(headers['X-Extra-Info'])}`);

  const url = 'https://openapi.zhihu.com/openapi/hackathon_story/list';
  console.log(`\n—— GET ${url} ——`);
  const t0 = Date.now();
  const res = await fetch(url, { headers: headers as unknown as Record<string, string> });
  const ms = Date.now() - t0;
  const text = await res.text();
  console.log(`HTTP ${res.status} in ${ms}ms · ${text.length} bytes`);
  console.log(text.slice(0, 800));
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error('✗ smoke test failed:', err);
  process.exit(1);
});
