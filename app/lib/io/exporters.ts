'use client';

import type { Editor } from '@tiptap/react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

export function exportMarkdown(editor: Editor): Blob {
  const storage = (editor.storage as { markdown?: { getMarkdown(): string } }).markdown;
  const md =
    typeof storage?.getMarkdown === 'function'
      ? storage.getMarkdown()
      : htmlToFallbackMarkdown(editor.getHTML());
  return new Blob([md], { type: 'text/markdown;charset=utf-8' });
}

export function exportText(editor: Editor): Blob {
  const text = editor.state.doc.textContent.replace(/ /g, ' ');
  return new Blob([text], { type: 'text/plain;charset=utf-8' });
}

export function exportHtml(editor: Editor): Blob {
  const body = editor.getHTML();
  const doc = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>看山书房 稿件</title>
<style>
  body { font-family: "Noto Serif SC", "Source Han Serif SC", serif; max-width: 720px; margin: 40px auto; line-height: 1.78; color: #1A1F2A; }
  sup[data-citation-id] { color: #1772F6; }
</style>
</head>
<body>
${body}
</body>
</html>`;
  return new Blob([doc], { type: 'text/html;charset=utf-8' });
}

interface JsonNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: JsonNode[];
}

function runFromText(node: JsonNode): TextRun {
  const marks = new Set((node.marks ?? []).map((m) => m.type));
  return new TextRun({
    text: node.text ?? '',
    bold: marks.has('bold'),
    italics: marks.has('italic'),
    strike: marks.has('strike'),
    underline: marks.has('underline') ? {} : undefined,
    highlight: marks.has('highlight') ? 'yellow' : undefined,
  });
}

function paragraphFromNode(node: JsonNode): Paragraph[] {
  if (!node.content) return [new Paragraph('')];
  const runs: TextRun[] = [];
  for (const child of node.content) {
    if (child.type === 'text') runs.push(runFromText(child));
    else if (child.type === 'hardBreak') runs.push(new TextRun({ break: 1 }));
    else if (child.content) {
      for (const grand of child.content) {
        if (grand.type === 'text') runs.push(runFromText(grand));
      }
    }
  }
  if (node.type === 'heading') {
    const lvl = (node.attrs?.level as number) ?? 1;
    const map: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    };
    return [new Paragraph({ heading: map[lvl] ?? HeadingLevel.HEADING_1, children: runs })];
  }
  if (node.type === 'blockquote' && node.content) {
    return node.content.flatMap((c) =>
      paragraphFromNode(c).map((p) => {
        // best-effort indent
        return p;
      }),
    );
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    if (!node.content) return [];
    return node.content.flatMap((li, i) => {
      const prefix = node.type === 'orderedList' ? `${i + 1}. ` : '• ';
      const liRuns: TextRun[] = [new TextRun({ text: prefix })];
      for (const para of li.content ?? []) {
        for (const child of para.content ?? []) {
          if (child.type === 'text') liRuns.push(runFromText(child));
        }
      }
      return [new Paragraph({ children: liRuns })];
    });
  }
  return [new Paragraph({ alignment: AlignmentType.LEFT, children: runs })];
}

export async function exportDocx(editor: Editor): Promise<Blob> {
  const json = editor.getJSON() as unknown as JsonNode;
  const blocks = json.content ?? [];
  const paragraphs = blocks.flatMap(paragraphFromNode);
  if (paragraphs.length === 0) paragraphs.push(new Paragraph(''));
  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
    styles: {
      default: {
        document: { run: { font: 'Noto Serif SC', size: 24 } },
      },
    },
  });
  const blob = await Packer.toBlob(doc);
  return blob;
}

export async function exportPdf(containerEl: HTMLElement): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');
  const canvas = await html2canvas(containerEl, {
    backgroundColor: '#FAF8F3',
    scale: 2,
    useCORS: true,
  });
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = canvas.width / pageW;
  const sliceHpx = pageH * ratio;
  let yPx = 0;
  let firstPage = true;
  while (yPx < canvas.height) {
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.min(sliceHpx, canvas.height - yPx);
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');
    ctx.drawImage(canvas, 0, yPx, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
    const img = sliceCanvas.toDataURL('image/jpeg', 0.92);
    if (!firstPage) pdf.addPage();
    pdf.addImage(img, 'JPEG', 0, 0, pageW, (sliceCanvas.height / ratio));
    firstPage = false;
    yPx += sliceHpx;
  }
  return pdf.output('blob');
}

// Minimal HTML → markdown fallback used only if the Markdown TipTap extension
// is not installed in a given editor instance (e.g. tests with a bare editor).
function htmlToFallbackMarkdown(html: string): string {
  return html
    .replace(/<h([1-6])>(.+?)<\/h\1>/gi, (_m, n: string, t: string) => `${'#'.repeat(Number(n))} ${t}\n\n`)
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong>(.+?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.+?)<\/em>/gi, '*$1*')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}
