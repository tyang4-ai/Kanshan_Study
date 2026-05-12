import 'server-only';
import type { FoxId } from '@/lib/foxes/registry';
import { pickAssetUrl } from '@/lib/art/asset-resolver';

const FOX_IDS: FoxId[] = ['shan', 'mo', 'wen', 'wen2', 'shui', 'dian', 'shi', 'jing', 'xin'];

export interface LoreAssets {
  huts: Partial<Record<FoxId, string>>;
  bg: string | null;
}

// Server-only: resolves `/art/lore/huts/<foxId>.png` + `/art/bg/lore.jpg` from
// disk via the asset-resolver. Missing assets yield null entries that the
// LorePortal / House fallback path handles gracefully.
export function getLoreAssets(): LoreAssets {
  const huts: Partial<Record<FoxId, string>> = {};
  for (const id of FOX_IDS) {
    const url = pickAssetUrl(`/art/lore/huts/${id}.png`);
    if (url) huts[id] = url;
  }
  return {
    huts,
    // Prefer PNG (Gemini output format), fall back to JPG.
    bg: pickAssetUrl('/art/bg/lore.png') ?? pickAssetUrl('/art/bg/lore.jpg'),
  };
}
