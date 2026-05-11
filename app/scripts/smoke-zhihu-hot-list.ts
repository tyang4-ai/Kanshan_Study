/**
 * Pre-5/12 smoke test for the developer.zhihu.com Bearer-auth endpoints.
 * Hits /api/v1/content/hot_list (the cheapest endpoint) with Limit=3 to
 * verify auth + response shape without burning quota.
 *
 * Usage (from app/):
 *   pnpm tsx --env-file=.env.local scripts/smoke-zhihu-hot-list.ts
 *
 * Requires .env.local with ZHIHU_ACCESS_SECRET (the 32-char AccessKey from
 * developer.zhihu.com/profile, issued 5/9). Output:
 *   - the headers we'd send (token masked)
 *   - the live response (3 hot-list items) on success
 *   - HTTP status / response body on failure
 *
 * Burns 1 quota call. Safe to run once or twice; do NOT loop.
 */

export {};

async function main(): Promise<void> {
  const accessSecret = process.env.ZHIHU_ACCESS_SECRET;
  if (!accessSecret) {
    console.error('✗ ZHIHU_ACCESS_SECRET missing in .env.local');
    process.exit(1);
  }

  const ts = String(Math.floor(Date.now() / 1000));
  const headers = {
    Authorization: `Bearer ${accessSecret}`,
    'X-Request-Timestamp': ts,
    'Content-Type': 'application/json',
  };
  console.log('—— headers ——');
  console.log(`  Authorization:       Bearer ${accessSecret.slice(0, 4)}…[REDACTED]`);
  console.log(`  X-Request-Timestamp: ${ts}`);

  const url = 'https://developer.zhihu.com/api/v1/content/hot_list?Limit=3';
  console.log(`\n—— GET ${url} ——`);
  const t0 = Date.now();
  const res = await fetch(url, { headers });
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
