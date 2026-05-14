// r5 TASK I (李笛 P2): live relational-memory scan endpoint. Embeds the
// probe sentence with BGE-M3 and cosines it against the demo persona's vault
// + most-recent visit snippets. Returns annotations with similarity > 0.80.
//
// Cache-only / no-BYO-key requests return [] silently — the fixture path in
// scanner.ts is the demo guarantee, this route is the BYO-key enrichment.

import { NextRequest, NextResponse } from 'next/server';
import { mustUseCacheOnly } from '@/lib/apikey/public-gate';
import { embed } from '@/lib/embeddings';
import meSeed from '@/content/seed/vault-guwanxi.json';

export const runtime = 'nodejs';

interface SeedEntry {
  id: string;
  title: string;
  snippet: string;
  date: string;
}

interface ScanBody {
  sentence?: string;
}

interface ScanAnnotation {
  kind: 'echo' | 'contradict';
  anchor: string;
  refTitle: string;
  refExcerpt: string;
  similarity: number;
  source: 'live';
}

const ECHO_THRESHOLD = 0.80;
// Negation cues for the heuristic echo-vs-contradict split. When the probe
// sentence carries any of these AND the matched entry doesn't (or vice versa),
// we tag the annotation 'contradict'.
const NEGATION_CUES = /不|没|否|无法|不能|不会|不应|从未|绝不|未必|不一定/;

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Cache-only / anonymous → fixtures-only mode, no live embed.
  if (mustUseCacheOnly(req)) {
    return NextResponse.json({ annotations: [] });
  }
  let body: ScanBody;
  try {
    body = (await req.json()) as ScanBody;
  } catch {
    return NextResponse.json({ annotations: [] });
  }
  const sentence = (body.sentence ?? '').trim();
  if (!sentence || sentence.length < 12) {
    return NextResponse.json({ annotations: [] });
  }
  try {
    const entries = meSeed as SeedEntry[];
    const [probeEmb, ...entryEmbs] = await embed([sentence, ...entries.map((e) => e.snippet)]);
    const annotations: ScanAnnotation[] = [];
    const probeNeg = NEGATION_CUES.test(sentence);
    entries.forEach((e, i) => {
      const sim = cosine(probeEmb, entryEmbs[i]);
      if (sim >= ECHO_THRESHOLD) {
        const refNeg = NEGATION_CUES.test(e.snippet);
        const kind: 'echo' | 'contradict' = probeNeg !== refNeg ? 'contradict' : 'echo';
        annotations.push({
          kind,
          anchor: sentence,
          refTitle: e.title,
          refExcerpt: e.snippet.slice(0, 80),
          similarity: sim,
          source: 'live',
        });
      }
    });
    // Keep top 3 by similarity.
    annotations.sort((a, b) => b.similarity - a.similarity);
    return NextResponse.json({ annotations: annotations.slice(0, 3) });
  } catch (err) {
    console.warn('[relmem/scan] failed:', (err as Error).message);
    return NextResponse.json({ annotations: [] });
  }
}
