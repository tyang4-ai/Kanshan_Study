'use client';

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(base: string, ext: string): string {
  const cleaned = base
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();
  const stem = cleaned.length > 0 ? cleaned : '看山书房稿件';
  return `${stem}.${ext.replace(/^\./, '')}`;
}
