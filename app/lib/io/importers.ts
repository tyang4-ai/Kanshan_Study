'use client';

import { Marked } from 'marked';
import mammoth from 'mammoth';

export type SupportedFormat = 'md' | 'txt' | 'docx';
export type SniffResult = SupportedFormat | 'unknown';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function sniffFormat(file: File): SniffResult {
  const name = file.name.toLowerCase();
  if (name.endsWith('.md') || name.endsWith('.markdown') || file.type === 'text/markdown') return 'md';
  if (name.endsWith('.docx') || file.type === DOCX_MIME) return 'docx';
  if (name.endsWith('.txt') || file.type === 'text/plain' || file.type === '') return 'txt';
  return 'unknown';
}

const marked = new Marked({ gfm: true, breaks: false });

export function importMarkdown(text: string): string {
  return marked.parse(text, { async: false }) as string;
}

export function importText(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const html = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<p></p>';
      return `<p>${escapeHtml(trimmed)}</p>`;
    })
    .join('');
  return html;
}

export async function importDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // Mammoth's option-matcher requires either {arrayBuffer} (browser) or
  // {buffer} (Node). jsdom's File.arrayBuffer() returns a SharedArrayBuffer
  // that mammoth rejects via "Could not find file in options". Pick the
  // right shape per runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const G = globalThis as any;
  if (typeof G.Buffer !== 'undefined') {
    const result = await mammoth.convertToHtml({ buffer: G.Buffer.from(arrayBuffer) });
    return result.value;
  }
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function importFile(file: File): Promise<{ html: string; format: SupportedFormat }> {
  const format = sniffFormat(file);
  if (format === 'unknown') {
    throw new Error(`不支持的文件格式：${file.name}`);
  }
  if (format === 'docx') {
    return { html: await importDocx(file), format };
  }
  const text = await file.text();
  if (format === 'md') return { html: importMarkdown(text), format };
  return { html: importText(text), format };
}
