// One-shot Kimi auth + model probe.

const KEY = process.env.KIMI_API_KEY ?? '';
const BASE = process.env.KIMI_BASE_URL ?? 'https://api.moonshot.cn';

async function main() {
  console.log('=== Kimi probe ===');
  console.log('Key prefix:', KEY.slice(0, 12), 'len:', KEY.length);

  // 1. List models available to this key
  const modelsRes = await fetch(`${BASE}/v1/models`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!modelsRes.ok) {
    console.log('models fetch failed:', modelsRes.status, await modelsRes.text());
    return;
  }
  const modelsJson = (await modelsRes.json()) as { data: Array<{ id: string }> };
  console.log('\nAvailable models:');
  for (const m of modelsJson.data) console.log('  -', m.id);

  // 2. Try smallest cheapest 8k model first
  const candidates = ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k', 'kimi-k2-0711-preview'];
  for (const model of candidates) {
    const t0 = Date.now();
    const res = await fetch(`${BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: '回复"OK"' }],
        max_tokens: 5,
        temperature: 0,
      }),
    });
    const text = await res.text();
    console.log(`\n[${model}] ${res.status} (${Date.now() - t0}ms)`);
    console.log('  ', text.slice(0, 200));
    if (res.ok) break;
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
