import { describe, it, expect } from 'vitest';
import { hotListToTrendSeed, type TrendSeed } from '@/lib/zhihu/__mappers';

describe('hotListToTrendSeed', () => {
  it('preserves rich seed-shape items unchanged', () => {
    const seed: TrendSeed = {
      id: 'rel-1',
      rank: 1,
      title: 'foo',
      heat: '8.2 万',
      ageHours: 2,
      ageLabel: '2 小时',
      tags: ['答主圈'],
      hot: true,
      vibes: 'v',
      vibesFox: 'shi',
    };
    const out = hotListToTrendSeed([seed], [seed]);
    expect(out[0]).toEqual(seed);
  });

  it('falls back to seed values for missing optional fields when id matches', () => {
    const seed: TrendSeed = {
      id: 'rel-1',
      rank: 1,
      title: 'foo',
      heat: '8.2 万',
      ageHours: 2,
      ageLabel: '2 小时',
      tags: ['答主圈'],
      hot: true,
      vibes: 'v',
      vibesFox: 'shi',
    };
    const out = hotListToTrendSeed([{ id: 'rel-1', title: 'foo' }], [seed]);
    expect(out[0].tags).toEqual(['答主圈']);
    expect(out[0].vibes).toBe('v');
  });

  it('uses defaults when no seed match', () => {
    const out = hotListToTrendSeed([{ id: 99, title: 'bar' }], []);
    expect(out[0]).toMatchObject({
      id: '99',
      rank: 1,
      title: 'bar',
      tags: [],
      hot: false,
      vibesFox: null,
    });
  });

  it('handles numeric heat by stringifying', () => {
    const out = hotListToTrendSeed([{ id: 1, title: 'foo', heat: 9438000 }], []);
    expect(out[0].heat).toBe('9438000');
  });
});
