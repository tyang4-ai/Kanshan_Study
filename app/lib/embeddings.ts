const BASE = 'https://api.siliconflow.cn/v1';

async function retry<T>(fn: () => Promise<T>, attempts = 3, initialDelay = 1000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err instanceof Error && /^Embed 429/.test(err.message) && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, initialDelay * Math.pow(2, i)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const key = process.env.SILICONFLOW_API_KEY;
  if (!key) throw new Error('SILICONFLOW_API_KEY is not set');

  return retry(async () => {
    const res = await fetch(`${BASE}/embeddings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'BAAI/bge-m3', input: texts }),
    });
    if (!res.ok) throw new Error(`Embed ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return json.data.map((d) => d.embedding);
  });
}
