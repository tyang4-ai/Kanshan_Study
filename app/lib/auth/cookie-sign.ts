// Phase #15.10 Track 2 (2026-05-11): minimal HMAC-SHA256 session signer.
// No 3rd-party JWT library — we don't need JWS/JWE semantics, just a
// tamper-proof envelope around a JSON payload. Format: `${payloadB64}.${sigB64}`
// where both halves are base64url-encoded.
import { createHmac, timingSafeEqual } from 'node:crypto';

function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Buffer | null {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    return Buffer.from(padded + pad, 'base64');
  } catch {
    return null;
  }
}

function hmac(secret: string, payloadB64: string): Buffer {
  return createHmac('sha256', secret).update(payloadB64).digest();
}

export function signSession<T extends object>(payload: T, secret: string): string {
  const json = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(Buffer.from(json, 'utf8'));
  const sigB64 = base64urlEncode(hmac(secret, payloadB64));
  return `${payloadB64}.${sigB64}`;
}

export function verifySession<T extends object>(token: string, secret: string): T | null {
  if (typeof token !== 'string') return null;
  const dotIdx = token.indexOf('.');
  if (dotIdx < 0 || dotIdx === token.length - 1) return null;
  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);
  if (!payloadB64 || !sigB64) return null;

  const providedSig = base64urlDecode(sigB64);
  if (!providedSig) return null;
  const expectedSig = hmac(secret, payloadB64);
  if (providedSig.length !== expectedSig.length) return null;
  if (!timingSafeEqual(providedSig, expectedSig)) return null;

  const payloadBuf = base64urlDecode(payloadB64);
  if (!payloadBuf) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadBuf.toString('utf8'));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const candidate = parsed as { exp?: unknown };
  if (typeof candidate.exp === 'number' && candidate.exp < Date.now()) return null;

  return parsed as T;
}
