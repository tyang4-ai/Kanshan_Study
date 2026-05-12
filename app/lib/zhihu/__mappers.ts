import type { HotListItem } from './types';

// TrendSeed is the existing UI shape consumed by TrendsTab + TrendItem.
// It's richer than the minimum HotListItem the 知乎 API returns. The mapper
// preserves API-required fields and falls back to seed values for fields the
// API doesn't surface (vibes, vibesFox, computed display tags). On 5/12 when
// real API shape is known, tighten field-name remapping here.

export interface TrendSeed {
  id: string;
  rank: number;
  title: string;
  heat: string;
  ageHours: number;
  ageLabel: string;
  tags: string[];
  hot: boolean;
  vibes: string;
  vibesFox: 'shi' | 'jing' | null;
  // R2 judge fix (吴伟 P0 2026-05-12): trend row needs a one-tap link back to
  // the source 知乎 question so 答主 can verify before any 选题 follow-up.
  url?: string;
}

export function hotListToTrendSeed(
  items: HotListItem[],
  fallback: TrendSeed[] = [],
): TrendSeed[] {
  return items.map((item, idx) => {
    const seed = fallback.find((s) => String(s.id) === String(item.id));
    return {
      id: String(item.id),
      rank: item.rank ?? seed?.rank ?? idx + 1,
      title: item.title,
      heat: typeof item.heat === 'number' ? String(item.heat) : (item.heat ?? seed?.heat ?? ''),
      ageHours: item.ageHours ?? seed?.ageHours ?? 1,
      ageLabel: item.ageLabel ?? seed?.ageLabel ?? '刚刚',
      tags: item.tags ?? seed?.tags ?? [],
      hot: item.hot ?? seed?.hot ?? false,
      vibes: item.vibes ?? seed?.vibes ?? '',
      vibesFox: (item.vibesFox ?? seed?.vibesFox ?? null) as 'shi' | 'jing' | null,
      url: item.url ?? seed?.url,
    };
  });
}
