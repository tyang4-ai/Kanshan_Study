import { describe, it, expect } from 'vitest';
import { PER_FOX_SETTINGS } from '@/lib/settings/per-fox';
import { FOXES, type FoxId } from '@/lib/foxes/registry';

describe('PER_FOX_SETTINGS', () => {
  it('has an entry for every FoxId in the registry', () => {
    for (const fox of FOXES) {
      expect(PER_FOX_SETTINGS[fox.id]).toBeDefined();
      expect(PER_FOX_SETTINGS[fox.id].rows.length).toBeGreaterThanOrEqual(1);
      expect(PER_FOX_SETTINGS[fox.id].groupTitle).toBeTruthy();
    }
  });

  it('shan defaultLLM excludes Claude/GPT/OpenAI (locked decision #4)', () => {
    const llmRow = PER_FOX_SETTINGS.shan.rows.find(
      (r) => r.kind === 'select' && r.key === 'defaultLLM'
    );
    expect(llmRow).toBeDefined();
    if (llmRow && llmRow.kind === 'select') {
      for (const opt of llmRow.options) {
        expect(opt).not.toMatch(/Claude/i);
        expect(opt).not.toMatch(/GPT/i);
        expect(opt).not.toMatch(/OpenAI/i);
      }
    }
  });

  it('every row has a non-empty label', () => {
    for (const fox of FOXES) {
      for (const row of PER_FOX_SETTINGS[fox.id].rows) {
        expect(row.label.length).toBeGreaterThan(0);
      }
    }
  });

  it.each(['shan', 'mo', 'wen', 'wen2', 'shui', 'dian', 'shi', 'jing', 'xin'] as FoxId[])(
    '%s entry typecheck (discriminated union)',
    (id) => {
      const entry = PER_FOX_SETTINGS[id];
      for (const row of entry.rows) {
        switch (row.kind) {
          case 'toggle':
            expect(typeof row.defaultOn).toBe('boolean');
            break;
          case 'slider':
            expect(typeof row.min).toBe('number');
            expect(typeof row.max).toBe('number');
            break;
          case 'select':
          case 'radio':
            expect(Array.isArray(row.options)).toBe(true);
            break;
          case 'chips':
            expect(Array.isArray(row.items)).toBe(true);
            break;
          case 'textarea':
          case 'code':
            expect(typeof row.value).toBe('string');
            break;
          case 'button':
            expect(typeof row.cta).toBe('string');
            expect(typeof row.action).toBe('string');
            break;
        }
      }
    }
  );
});
