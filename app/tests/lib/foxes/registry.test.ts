import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  FOXES,
  FOX_BY_ID,
  getFox,
  BODY_ASSET,
  type FoxId,
  type FoxMeta,
  type FoxVerb,
} from '@/lib/foxes/registry';

const EXPECTED_IDS: readonly FoxId[] = [
  'shan', 'mo', 'wen', 'wen2', 'shui', 'dian', 'shi', 'jing', 'xin',
];

const HEX = /^#[0-9A-Fa-f]{6}$/;

const publicPath = (assetPath: string): string =>
  path.join(process.cwd(), 'public', assetPath.replace(/^\//, ''));

describe('FOXES roster', () => {
  it('has exactly 9 entries', () => {
    expect(FOXES).toHaveLength(9);
  });

  it('contains every FoxId exactly once', () => {
    const ids = FOXES.map((f) => f.id);
    expect(new Set(ids).size).toBe(9);
    for (const expected of EXPECTED_IDS) {
      expect(ids).toContain(expected);
    }
  });
});

describe('FOX_BY_ID lookup', () => {
  it('round-trips for every fox', () => {
    for (const fox of FOXES) {
      expect(FOX_BY_ID[fox.id]).toBe(fox);
      expect(FOX_BY_ID[fox.id].id).toBe(fox.id);
    }
  });

  it('getFox returns the same reference as FOX_BY_ID', () => {
    for (const id of EXPECTED_IDS) {
      expect(getFox(id)).toBe(FOX_BY_ID[id]);
    }
  });
});

describe('per-fox required fields', () => {
  it.each(EXPECTED_IDS)('%s has all required non-empty fields', (id) => {
    const fox = getFox(id);
    expect(fox.name).toBeTruthy();
    expect(fox.epithet).toBeTruthy();
    expect(fox.role).toBeTruthy();
    expect(fox.species).toBeTruthy();
    expect(fox.persona).toBeTruthy();
    expect(fox.artStyle).toBeTruthy();
    expect(fox.initial).toHaveLength(1);
    expect(fox.catchphrase).toBeTruthy();
    expect(fox.tailPath.length).toBeGreaterThan(0);
    expect(fox.tailAsset).toBeTruthy();
    expect(fox.verbSubtitle).toBeTruthy();
  });
});

describe('color sanity', () => {
  it.each(EXPECTED_IDS)('%s has valid 6-digit hex glow / glowSoft / ink', (id) => {
    const fox = getFox(id);
    expect(fox.glow).toMatch(HEX);
    expect(fox.glowSoft).toMatch(HEX);
    expect(fox.ink).toMatch(HEX);
  });
});

describe('asset path invariants', () => {
  it.each(EXPECTED_IDS)('%s tailAsset is /foxes/tail-{id}.png', (id) => {
    expect(getFox(id).tailAsset).toBe(`/foxes/tail-${id}.png`);
  });

  it('BODY_ASSET is /foxes/body.png', () => {
    expect(BODY_ASSET).toBe('/foxes/body.png');
  });

  it('BODY_ASSET file exists on disk', () => {
    expect(existsSync(publicPath(BODY_ASSET))).toBe(true);
  });

  it.each(EXPECTED_IDS)('%s tailAsset file exists on disk', (id) => {
    expect(existsSync(publicPath(getFox(id).tailAsset))).toBe(true);
  });
});

describe('attribution invariants (locked decision #9)', () => {
  it('shan carries the hackathon §7 IP authorization line', () => {
    expect(getFox('shan').attribution).toBe('刘看山 IP 经知乎黑客松 2026 授权使用');
  });

  it('every non-shan fox has null attribution', () => {
    for (const id of EXPECTED_IDS) {
      if (id === 'shan') continue;
      expect(getFox(id).attribution).toBeNull();
    }
  });
});

describe('verb mapping (locked)', () => {
  it('exactly one fox has verb=orchestrate, and that fox is shan', () => {
    const orchestrators = FOXES.filter((f) => f.verb === 'orchestrate');
    expect(orchestrators).toHaveLength(1);
    expect(orchestrators[0].id).toBe('shan');
  });

  it('the other 8 distribute across the 3 user-facing verbs', () => {
    const userVerbs: FoxVerb[] = ['灵感激发', '思路梳理', '内容精加工'];
    const nonShan = FOXES.filter((f) => f.id !== 'shan');
    expect(nonShan).toHaveLength(8);
    for (const fox of nonShan) {
      expect(userVerbs).toContain(fox.verb);
    }
  });
});

describe('uniqueness', () => {
  it('tailPath strings are all distinct', () => {
    const paths = FOXES.map((f) => f.tailPath);
    expect(new Set(paths).size).toBe(9);
  });

  it('tailAsset paths are all distinct', () => {
    const assets = FOXES.map((f) => f.tailAsset);
    expect(new Set(assets).size).toBe(9);
  });

  it('glow hex codes are all distinct', () => {
    const glows = FOXES.map((f) => f.glow);
    expect(new Set(glows).size).toBe(9);
  });
});

describe('FoxMeta type-export shape', () => {
  it('a FoxMeta literal compiles with all required fields', () => {
    const sample: FoxMeta = {
      id: 'shan',
      name: 'x', epithet: 'x', role: 'x', species: 'x', persona: 'x',
      artStyle: 'x', glow: '#000000', glowSoft: '#FFFFFF', ink: '#000000',
      initial: 'x', catchphrase: 'x', tailPath: 'x', tailAsset: 'x',
      verb: 'orchestrate', verbSubtitle: 'x', attribution: null,
    };
    expect(sample.id).toBe('shan');
  });
});
