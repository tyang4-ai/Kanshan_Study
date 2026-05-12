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
  // R2 judge fix (颜鑫 P2 2026-05-12): always stamp `iat` (issued-at, unix
  // seconds) into the signed payload so the verifier can enforce a maximum
  // session age independent of `exp`. Pre-fix tokens missing `iat` still
  // verify (we don't reject on absence) — keeps existing cookies live.
  const stamped = 'iat' in payload
    ? payload
    : ({ iat: Math.floor(Date.now() / 1000), ...payload } as T & { iat: number });
  const json = JSON.stringify(stamped);
  const payloadB64 = base64urlEncode(Buffer.from(json, 'utf8'));
  const sigB64 = base64urlEncode(hmac(secret, payloadB64));
  return `${payloadB64}.${sigB64}`;
}

/** Optional replay-window guard. Caller passes the maximum allowed session
 *  age in seconds; if the token's `iat` is older, verifySession returns null.
 *  Backward-compatible: tokens minted before iat was added (no `iat`) skip
 *  this check rather than getting rejected. */
export interface VerifyOptions {
  maxAgeSeconds?: number;
}

export function verifySession<T extends object>(
  token: string,
  secret: string,
  options: VerifyOptions = {},
): T | null {
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

  const candidate = parsed as { exp?: unknown; iat?: unknown };
  if (typeof candidate.exp === 'number' && candidate.exp < Date.now()) return null;
  if (
    typeof options.maxAgeSeconds === 'number' &&
    typeof candidate.iat === 'number'
  ) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec - candidate.iat > options.maxAgeSeconds) return null;
  }

  return parsed as T;
}
