import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Persona-review 2026-05-10 (Round 3, 吴敏 + 王婉清 + 小李) flagged that the
 * TipTap Placeholder extension was correctly attaching `is-editor-empty` +
 * `data-placeholder` to the empty <p>, but `getComputedStyle(::before).content`
 * returned 'none' — the CSS rule wasn't reaching the browser despite living
 * in globals.css. Cause: rule outside @layer + :first-child selector that
 * may not match TipTap's actual DOM shape.
 *
 * This test guards the CSS file itself (jsdom doesn't fully apply @layer
 * cascades to computed styles in tests, so we verify the rule SHIPS in the
 * source rather than its runtime computed value).
 */
describe('TipTap Placeholder CSS rule (globals.css)', () => {
  const css = readFileSync(
    join(__dirname, '../../../app/globals.css'),
    'utf-8',
  );

  it('ships the placeholder ::before rule', () => {
    expect(css).toMatch(/\.ProseMirror p\.is-editor-empty\[data-placeholder\]::before/);
  });

  it('wraps the rule in @layer utilities (Tailwind v4 cascade)', () => {
    // Find the @layer utilities block; assert the placeholder rule lives
    // inside it. (Avoid the `s` regex flag since this test runs through
    // tsc and our target is ES2017.)
    const layerStart = css.indexOf('@layer utilities');
    expect(layerStart).toBeGreaterThan(-1);
    const ruleStart = css.indexOf('is-editor-empty[data-placeholder]');
    expect(ruleStart).toBeGreaterThan(layerStart);
    const contentAttr = css.indexOf('content: attr(data-placeholder)', ruleStart);
    expect(contentAttr).toBeGreaterThan(ruleStart);
  });

  it('uses content: attr(data-placeholder) (not a hardcoded string)', () => {
    expect(css).toMatch(/content:\s*attr\(data-placeholder\)/);
  });

  it('targets BOTH is-editor-empty and is-empty class variants', () => {
    expect(css).toMatch(/is-editor-empty\[data-placeholder\]/);
    expect(css).toMatch(/is-empty\[data-placeholder\]/);
  });
});
