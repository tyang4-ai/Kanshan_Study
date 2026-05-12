// Live read-only smoke of developer.zhihu.com Bearer endpoints.
// Verifies that the X2L bearer key actually returns real data, not just 401/etc.
// Run with: ZHIHU_ACCESS_SECRET=X2L... node scripts/smoke-zhihu-bearer.mjs
//
// Endpoints hit (all GET, all read-only):
//   GET /api/v1/content/hot_list       — 知乎热榜
//   GET /api/v1/content/zhihu_search   — 知乎站内搜索
//   GET /api/v1/content/global_search  — 全网搜索
//   POST /v1/chat/completions          — 直答 (1 ¥0.001 message; counts against 100/day)

const ACCESS = process.env.ZHIHU_ACCESS_SECRET;
if (!ACCESS) {
  console.error('ZHIHU_ACCESS_SECRET not set');
  process.exit(1);
}

const BASE = 'https://developer.zhihu.com';

function ts() {
  return String(Math.floor(Date.now() / 1000));
}

async function hit(label, path, init = {}) {
  const url = new URL(path, BASE);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) url.searchParams.set(k, String(v));
  }
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${ACCESS}`,
        'X-Request-Timestamp': ts(),
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
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
  // Summary
  if (parsed && typeof parsed === 'object') {
    if ('Code' in parsed) {
      console.log(`Code: ${parsed.Code}  Message: ${parsed.Message ?? ''}`);
      const data = parsed.Data;
      if (data && typeof data === 'object') {
        if (Array.isArray(data.Items)) {
          console.log(`Data.Items.length: ${data.Items.length}`);
          for (let i = 0; i < Math.min(3, data.Items.length); i++) {
            const it = data.Items[i];
            console.log(
              `  [${i}] ${(it.Title ?? it.title ?? '<no title>').slice(0, 60)} · ` +
                `${it.ContentType ?? it.type ?? ''} · vote=${it.VoteUpCount ?? '-'}`,
            );
          }
        } else {
          console.log('Data:', JSON.stringify(data).slice(0, 200));
        }
      } else {
        console.log('Data:', String(data).slice(0, 200));
      }
    } else if (parsed.choices) {
      const text = parsed.choices?.[0]?.message?.content ?? '';
      console.log(`choices[0].message.content (first 200): ${text.slice(0, 200)}`);
    } else {
      console.log('shape:', Object.keys(parsed).join(', '));
      console.log('body (first 300):', JSON.stringify(parsed).slice(0, 300));
    }
  }
  return parsed;
}

async function main() {
  console.log('Bearer:', ACCESS.slice(0, 4) + '***' + ACCESS.slice(-4));
  console.log('Time:', new Date().toISOString());

  await hit('hot_list', '/api/v1/content/hot_list', { query: { Limit: 5 } });
  await hit('zhihu_search · 影像组学', '/api/v1/content/zhihu_search', {
    query: { Query: '影像组学', Count: 3 },
  });
  await hit('global_search · 知乎黑客松', '/api/v1/content/global_search', {
    query: { Query: '知乎黑客松', Count: 3 },
  });
  await hit('zhida · 一句话介绍 RAG', '/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: 'zhida-fast-1p5',
      messages: [{ role: 'user', content: '一句话介绍 RAG (retrieval-augmented generation)。' }],
      stream: false,
    }),
  });

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
