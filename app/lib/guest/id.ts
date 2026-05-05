// hashGuestId(ip, ua) → 12-char hex. Edge-safe (uses Web Crypto subtle).
// Empty/missing inputs → fall back to a fixed token so we still get a stable
// hash (unique-per-machine isn't possible behind shared NAT but isn't our
// goal — we just need a stable handle per browser session).

export async function hashGuestId(ip: string, userAgent: string): Promise<string> {
  const input = `${ip || 'unknown-ip'}|${userAgent || 'unknown-ua'}`;
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(hash);
  let hex = '';
  for (let i = 0; i < 6; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}
