// Live HMAC-side smoke for openapi.zhihu.com community endpoints.
// Run with:
//   ZHIHU_APP_KEY=<yourhomepagesuffix> \
//   ZHIHU_APP_SECRET=<your32charmoltbookhmacsecret> \
//   node scripts/smoke-zhihu-hmac.mjs
//
// Endpoints covered (READ-ONLY, zero risk):
//   GET  /openapi/hackathon_story/list   — 知乎故事 list
//   POST /openapi/pin/publish            — dry-validation only (empty body, expects Code≠0)
//
// IMPORTANT: this script will NOT post a real pin. The publish call sends an
// empty content payload specifically to get a validation error back — proves
// HMAC auth succeeds without committing anything to your 想法 timeline.
//
// Once both calls return Code=0 (for story_list) and Code=<known-validation-error>
// (for the empty publish), the HMAC scheme is verified end-to-end.

import { createHmac, randomBytes } from 'node:crypto';

const APP_KEY = process.env.ZHIHU_APP_KEY;
const APP_SECRET = process.env.ZHIHU_APP_SECRET;

if (!APP_KEY || !APP_SECRET) {
  console.error('ZHIHU_APP_KEY + ZHIHU_APP_SECRET required.');
  console.error('  ZHIHU_APP_KEY = your 知乎 homepage URL suffix (zhihu.com/people/<this>)');
  console.error('  ZHIHU_APP_SECRET = the 32-char moltbook HMAC secret');
  process.exit(1);
}

const BASE = 'https://openapi.zhihu.com';

function sign(appKey, appSecret) {
  const ts = String(Math.floor(Date.now() / 1000));
  const logId = `kanshan-smoke-${randomBytes(8).toString('hex')}`;
  const extra = '';
  const signStr = `app_key:${appKey}|ts:${ts}|logid:${logId}|extra_info:${extra}`;
  const sig = createHmac('sha256', appSecret).update(signStr).digest('base64');
  return {
    'X-App-Key': appKey,
    'X-Timestamp': ts,
    'X-Log-Id': logId,
    'X-Sign': sig,
    'X-Extra-Info': extra,
  };
}

async function hit(label, path, init = {}) {
  const url = new URL(path, BASE);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) url.searchParams.set(k, String(v));
  }
  const t0 = Date.now();
  const headers = {
    ...sign(APP_KEY, APP_SECRET),
    'Content-Type': 'application/json',
    ...(init.headers ?? {}),
  };
  let res;
  try {
    res = await fetch(url, {
      method: init.method ?? 'GET',
      headers,
      body: init.body,
    });
  } catch (err) {
    console.log(`\n=== ${label} ===`);
    console.log(`✗ FETCH ERROR: ${err.message}`);
    return null;
  }
  const dt = Date.now() - t0;
  const status = res.status;
  let body = '';
  try {
    body = await res.text();
  } catch {
    /* ignore */
  }
  console.log(`\n=== ${label} ===`);
  console.log(`url: ${url}`);
  console.log(`status: ${status}  (${dt}ms)`);
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    console.log(`body (raw, first 400 chars): ${body.slice(0, 400)}`);
    return null;
  }
  if (parsed && typeof parsed === 'object') {
    console.log(`Code: ${parsed.Code ?? '<no Code>'}`);
    console.log(`Message: ${parsed.Message ?? '<no Message>'}`);
    console.log(`RAW BODY (first 800 chars): ${body.slice(0, 800)}`);
    const data = parsed.Data;
    if (data && typeof data === 'object') {
      if (Array.isArray(data.Items)) {
        console.log(`Data.Items.length: ${data.Items.length}`);
        for (let i = 0; i < Math.min(3, data.Items.length); i++) {
          const it = data.Items[i];
          console.log(
            `  [${i}] ${(it.Title ?? it.Name ?? it.title ?? '<no title>').toString().slice(0, 60)}`,
          );
        }
      } else if (Array.isArray(data)) {
        console.log(`Data.length: ${data.length}`);
        for (let i = 0; i < Math.min(3, data.length); i++) {
          console.log(`  [${i}] ${JSON.stringify(data[i]).slice(0, 100)}`);
        }
      } else {
        console.log('Data shape:', Object.keys(data).join(', '));
      }
    }
  }
  return parsed;
}

async function main() {
  console.log('App key:', APP_KEY);
  console.log('App secret:', APP_SECRET.slice(0, 4) + '***' + APP_SECRET.slice(-4));
  console.log('Time:', new Date().toISOString());

  // 1. Read-only: 知乎故事 list. If HMAC is correct, returns Code=0 + items.
  await hit('story_list', '/openapi/hackathon_story/list');

  // 2. Dry-validation: publish empty content. Expect Code≠0 ("content required"
  //    or similar). Proves auth succeeds without committing a real post.
  await hit('publish/pin (DRY — empty content)', '/openapi/publish/pin', {
    method: 'POST',
    body: JSON.stringify({ content: '', ring_id: '2029619126742656657' }),
  });

  console.log('\nDone. Expected:');
  console.log('  story_list   → Code=0 (success)');
  console.log('  pin/publish  → Code≠0 with "content empty" / similar (validation error)');
  console.log('Any 401/403/missing-signature error means the HMAC signing or app_key is wrong.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
