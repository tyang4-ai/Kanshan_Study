import { describe, it, expect } from 'vitest';
import {
  sniffFormat,
  importMarkdown,
  importText,
  importDocx,
  importFile,
} from '@/lib/io/importers';
import { Document, Packer, Paragraph, TextRun } from 'docx';

function makeFile(name: string, type: string, contents: string | Uint8Array): File {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new File([contents as any], name, { type });
}

describe('sniffFormat', () => {
  it('detects .md by extension', () => {
    expect(sniffFormat(makeFile('a.md', '', 'x'))).toBe('md');
    expect(sniffFormat(makeFile('a.markdown', '', 'x'))).toBe('md');
  });
  it('detects .docx by extension', () => {
    expect(sniffFormat(makeFile('a.docx', '', 'x'))).toBe('docx');
  });
  it('detects .txt by extension', () => {
    expect(sniffFormat(makeFile('a.txt', 'text/plain', 'x'))).toBe('txt');
  });
  it('detects by MIME when extension absent', () => {
    expect(sniffFormat(makeFile('noext', 'text/markdown', 'x'))).toBe('md');
    expect(
      sniffFormat(
        makeFile(
          'noext',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'x',
        ),
      ),
    ).toBe('docx');
  });
  it('returns unknown for an unsupported file', () => {
    expect(sniffFormat(makeFile('a.exe', 'application/x-msdownload', 'x'))).toBe('unknown');
  });
});

describe('importMarkdown', () => {
  it('converts headings and paragraphs to HTML', () => {
    const html = importMarkdown('# 标题\n\n正文一\n\n正文二');
    expect(html).toContain('<h1');
    expect(html).toContain('标题');
    expect(html).toContain('<p>正文一</p>');
  });
  it('handles bold + italic', () => {
    const html = importMarkdown('**bold** *italic*');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });
});

describe('importText', () => {
  it('wraps each line in <p>', () => {
    const html = importText('一\n二\n三');
    expect(html).toBe('<p>一</p><p>二</p><p>三</p>');
  });
  it('emits empty <p> for blank lines', () => {
    const html = importText('一\n\n二');
    expect(html).toBe('<p>一</p><p></p><p>二</p>');
  });
  it('escapes HTML in plain text', () => {
    const html = importText('<script>alert("x")</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('importDocx', () => {
  it('converts a generated docx back to HTML containing the text', async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ children: [new TextRun('从 docx 导入的内容')] }),
          ],
        },
      ],
    });
    const buf = await Packer.toBuffer(doc);
    const file = makeFile('sample.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      new Uint8Array(buf),
    );
    const html = await importDocx(file);
    expect(html).toContain('从 docx 导入的内容');
  });
});

describe('importFile dispatch', () => {
  it('dispatches md → markdown parser', async () => {
    const file = makeFile('a.md', 'text/markdown', '# h\n\np');
    const r = await importFile(file);
    expect(r.format).toBe('md');
    expect(r.html).toContain('<h1');
  });
  it('rejects unsupported format', async () => {
    const file = makeFile('a.exe', 'application/x-msdownload', 'x');
    await expect(importFile(file)).rejects.toThrow(/不支持/);
  });
});
