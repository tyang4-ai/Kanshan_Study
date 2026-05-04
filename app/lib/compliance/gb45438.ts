/**
 * GB 45438-2025 双标识 (dual-mark) helper.
 * 显式标识: visible "AI 协作 · 看山书房" footer in exported text.
 * 隐式标识: structured frontmatter / EXIF-style metadata block in the export.
 */
import { useProvenanceStore, type ProvenanceKind } from '@/lib/store/provenance';

export interface ProvenanceCounts {
  aiTouchedSpans: number;
  claims: number;
  hedges: number;
  sourced: number;
  flagged: number;
}

export interface ExportMetadata {
  generator: string;
  generatedAt: string;
  models: readonly string[];
  provenance: ProvenanceCounts;
  gb45438_2025: true;
}

const EXPLICIT_FOOTER = '\n\n---\n本文创作工具：看山书房 · AI 协作（GB 45438-2025 标识）';

const MODELS = ['DeepSeek-V3', 'DeepSeek-R1', 'BGE-M3'] as const;

function countsFromStore(): ProvenanceCounts {
  const entries = useProvenanceStore.getState().entries;
  const tally: Record<ProvenanceKind, number> = {
    'ai-touched': 0,
    claim: 0,
    hedge: 0,
    sourced: 0,
    flagged: 0,
  };
  for (const e of entries) tally[e.kind]++;
  return {
    aiTouchedSpans: tally['ai-touched'],
    claims: tally.claim,
    hedges: tally.hedge,
    sourced: tally.sourced,
    flagged: tally.flagged,
  };
}

export function buildMetadata(): ExportMetadata {
  return {
    generator: '看山书房 v0.1',
    generatedAt: new Date().toISOString(),
    models: MODELS,
    provenance: countsFromStore(),
    gb45438_2025: true,
  };
}

export function stampMarkdown(content: string): string {
  const meta = buildMetadata();
  const fm = [
    '---',
    `generator: "${meta.generator}"`,
    `generated_at: "${meta.generatedAt}"`,
    `gb_45438_2025: true`,
    `models: [${meta.models.map((m) => `"${m}"`).join(', ')}]`,
    `ai_touched_spans: ${meta.provenance.aiTouchedSpans}`,
    `claims: ${meta.provenance.claims}`,
    `hedges: ${meta.provenance.hedges}`,
    `sourced: ${meta.provenance.sourced}`,
    `flagged: ${meta.provenance.flagged}`,
    '---',
    '',
  ].join('\n');
  return fm + content + EXPLICIT_FOOTER;
}
