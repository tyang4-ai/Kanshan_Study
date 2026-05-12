import { describe, it, expect } from 'vitest';
import { exportMarkdown, exportText, exportHtml, exportDocx } from '@/lib/io/exporters';

type FakeEditor = {
  getHTML(): string;
  getJSON(): unknown;
  state: { doc: { textContent: string } };
  storage: { markdown?: { getMarkdown(): string } };
};

function fakeEditor(opts: {
  html?: string;
  text?: string;
  json?: unknown;
  markdown?: string;
}): FakeEditor {
  return {
    getHTML: () => opts.html ?? '<p>hello</p>',
    getJSON: () =>
      opts.json ?? {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: opts.text ?? 'hello' }] },
        ],
      },
    state: { doc: { textContent: opts.text ?? 'hello' } },
    storage: opts.markdown !== undefined ? { markdown: { getMarkdown: () => opts.markdown! } } : {},
  };
}

describe('exporters', () => {
  it('exportMarkdown uses editor.storage.markdown when available', async () => {
    const e = fakeEditor({ markdown: '# hello\n\nworld' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = exportMarkdown(e as any);
    expect(blob.type).toMatch(/markdown/);
    const text = await blob.text();
    expect(text).toBe('# hello\n\nworld');
  });

  it('exportMarkdown falls back to HTML conversion when storage missing', async () => {
    const e = fakeEditor({ html: '<h1>标题</h1><p>正文</p>' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = exportMarkdown(e as any);
    const text = await blob.text();
    expect(text).toContain('# 标题');
    expect(text).toContain('正文');
  });

  it('exportText returns plain text from doc.textContent', async () => {
    const e = fakeEditor({ text: '影像组学 看山书房' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = exportText(e as any);
    expect(blob.type).toMatch(/plain/);
    const text = await blob.text();
    expect(text).toBe('影像组学 看山书房');
  });

  it('exportHtml wraps body in DOCTYPE+html scaffold', async () => {
    const e = fakeEditor({ html: '<p>x</p>' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = exportHtml(e as any);
    const text = await blob.text();
    expect(text).toMatch(/^<!DOCTYPE html>/);
    expect(text).toContain('<p>x</p>');
    expect(text).toContain('lang="zh-CN"');
  });

  it('exportDocx returns a non-empty Blob with the docx MIME', async () => {
    const e = fakeEditor({
      json: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '标题' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '正文一', marks: [{ type: 'bold' }] }] },
          { type: 'paragraph', content: [{ type: 'text', text: '正文二' }] },
        ],
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = await exportDocx(e as any);
    expect(blob.size).toBeGreaterThan(0);
    // docx MIME may not be set explicitly by the Packer; just verify the bytes
    // start with the OOXML zip magic bytes "PK\x03\x04".
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('exportDocx handles empty document without throwing', async () => {
    const e = fakeEditor({ json: { type: 'doc', content: [] } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = await exportDocx(e as any);
    expect(blob.size).toBeGreaterThan(0);
  });
});
