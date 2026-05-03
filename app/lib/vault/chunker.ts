const MIN = 80;
const MAX = 800;

export function chunkMarkdown(body: string): string[] {
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = '';
  for (const p of paragraphs) {
    if ((buf + '\n\n' + p).length <= MAX) {
      buf = buf ? buf + '\n\n' + p : p;
    } else {
      if (buf.length >= MIN) out.push(buf);
      if (p.length > MAX) {
        const sentences = p.split(/(?<=[。！？])/g);
        let sbuf = '';
        for (const s of sentences) {
          if ((sbuf + s).length > MAX && sbuf.length >= MIN) { out.push(sbuf); sbuf = s; }
          else sbuf += s;
        }
        if (sbuf.length >= MIN) out.push(sbuf);
        buf = '';
      } else {
        buf = p;
      }
    }
  }
  if (buf.length >= MIN) out.push(buf);
  return out;
}
