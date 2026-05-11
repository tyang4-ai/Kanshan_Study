import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderResearchBody } from '@/lib/research/sanitize';

/**
 * R2 code-quality persona-review 2026-05-11 P0: sanitize.ts had zero test
 * coverage despite being the XSS guard for LLM-fed HTML in ResearchTab.
 * These tests pin: allowlist behavior, escape behavior, hostile inputs.
 */
describe('renderResearchBody', () => {
  it('renders a single <p> with plain text', () => {
    const { container } = render(<div>{renderResearchBody('<p>Hello world</p>')}</div>);
    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.textContent).toBe('Hello world');
  });

  it('renders <sup data-cite-id> with the citation id preserved', () => {
    const { container } = render(
      <div>{renderResearchBody('<p>see ref<sup data-cite-id="r-w-1">[1]</sup>.</p>')}</div>,
    );
    const sup = container.querySelector('sup');
    expect(sup).not.toBeNull();
    expect(sup?.getAttribute('data-cite-id')).toBe('r-w-1');
    expect(sup?.textContent).toBe('[1]');
  });

  it('renders <span class="research-mark"> with the class preserved', () => {
    const { container } = render(
      <div>{renderResearchBody('<p>only <span class="research-mark">6%</span> validated</p>')}</div>,
    );
    const span = container.querySelector('span.research-mark');
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('6%');
  });

  it('strips <script> tags entirely (returns inner text only as plain string)', () => {
    const { container } = render(
      <div>{renderResearchBody('<p>safe<script>alert(1)</script>tail</p>')}</div>,
    );
    expect(container.querySelector('script')).toBeNull();
    // The literal "<script>alert(1)</script>" survives as text but is NOT
    // executed (React escapes it). The string in textContent will include
    // the inner "alert(1)" content because it sits between two text tokens.
    expect(container.querySelector('p')?.textContent).toContain('safe');
    expect(container.querySelector('p')?.textContent).toContain('tail');
  });

  it('strips disallowed tags (img with onerror) — no img element survives', () => {
    const { container } = render(
      <div>{renderResearchBody('<p><img src=x onerror="alert(1)">attack</p>')}</div>,
    );
    // The disallowed <img> tag never becomes a DOM element. The literal text
    // may survive as React-escaped string content (which is harmless — the
    // browser does not parse attribute names out of text nodes), but no
    // actual <img> element with the onerror handler can exist.
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('p')?.textContent).toContain('attack');
  });

  it('strips event-handler attributes on allowed tags (only allowlisted attrs survive)', () => {
    const { container } = render(
      <div>
        {renderResearchBody(
          '<p onclick="alert(1)"><sup data-cite-id="r1" onerror="alert(1)">[1]</sup></p>',
        )}
      </div>,
    );
    expect(container.querySelector('p')?.getAttribute('onclick')).toBeNull();
    const sup = container.querySelector('sup');
    expect(sup?.getAttribute('onerror')).toBeNull();
    expect(sup?.getAttribute('data-cite-id')).toBe('r1');
  });

  it('escapes cite-id values with hostile content (React attribute escaping)', () => {
    const hostile = '"><script>alert(1)</script>';
    const { container } = render(
      <div>{renderResearchBody(`<p><sup data-cite-id="${hostile}">[!]</sup></p>`)}</div>,
    );
    // Tokenizer captures the cite-id value via the regex, but React's
    // attribute-escape neutralizes the breakout attempt.
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('<script>');
  });

  it('span without the research-mark class is dropped (children still flow)', () => {
    const { container } = render(
      <div>{renderResearchBody('<p>a<span class="other">b</span>c</p>')}</div>,
    );
    expect(container.querySelector('span.research-mark')).toBeNull();
    expect(container.querySelector('span.other')).toBeNull();
    expect(container.querySelector('p')?.textContent).toBe('abc');
  });

  it('renders an empty body without crashing', () => {
    const { container } = render(<div>{renderResearchBody('')}</div>);
    expect(container.textContent).toBe('');
  });

  it('renders multiple paragraphs in order', () => {
    const { container } = render(
      <div>{renderResearchBody('<p>first</p><p>second</p><p>third</p>')}</div>,
    );
    const ps = Array.from(container.querySelectorAll('p'));
    expect(ps).toHaveLength(3);
    expect(ps.map((p) => p.textContent)).toEqual(['first', 'second', 'third']);
  });

  it('uses a per-call counter (no key collisions across calls)', () => {
    // Render two sibling instances to confirm React keys don't collide and
    // produce a warning. If module-scope counter regressed, React would
    // log "Encountered two children with the same key" in test output.
    const { container } = render(
      <div>
        <div data-testid="a">{renderResearchBody('<p>alpha</p>')}</div>
        <div data-testid="b">{renderResearchBody('<p>beta</p>')}</div>
      </div>,
    );
    expect(container.querySelector('[data-testid="a"] p')?.textContent).toBe('alpha');
    expect(container.querySelector('[data-testid="b"] p')?.textContent).toBe('beta');
  });

  it('tolerates mismatched / unbalanced tags without throwing', () => {
    expect(() => renderResearchBody('<p>open never closes')).not.toThrow();
    expect(() => renderResearchBody('</p>orphan close')).not.toThrow();
    expect(() => renderResearchBody('<p><sup>nested</p></sup>')).not.toThrow();
  });

  it('does not render disallowed tags as elements (iframe, a, img, style)', () => {
    const html = '<p>x<iframe src="evil"></iframe><a href="javascript:void(0)">y</a><img src=x><style>body{}</style>z</p>';
    const { container } = render(<div>{renderResearchBody(html)}</div>);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('style')).toBeNull();
  });
});
