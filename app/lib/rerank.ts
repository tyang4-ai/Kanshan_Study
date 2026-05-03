const BASE = 'https://api.siliconflow.cn/v1';

export interface RerankResult {
  index: number;
  score: number;
}

export async function rerank(query: string, documents: string[], topK = 5): Promise<RerankResult[]> {
  if (documents.length === 0) return [];
  const key = process.env.SILICONFLOW_API_KEY;
  if (!key) throw new Error('SILICONFLOW_API_KEY is not set');

  const res = await fetch(`${BASE}/rerank`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'Qwen/Qwen3-Reranker-8B', query, documents, top_n: topK }),
  });
  if (!res.ok) throw new Error(`Rerank ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { results: Array<{ index: number; relevance_score: number }> };
  return json.results.map((r) => ({ index: r.index, score: r.relevance_score }));
}
