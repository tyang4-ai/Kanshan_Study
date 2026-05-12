import { describe, it, expect } from 'vitest';
import { signSession, verifySession } from '@/lib/auth/cookie-sign';

const SECRET = 'a'.repeat(32);

interface Payload {
  uid: number;
  fullname: string;
  exp?: number;
}

describe('cookie-sign', () => {
  it('round-trips a payload', () => {
    const payload: Payload = { uid: 7, fullname: '我' };
    const token = signSession(payload, SECRET);
    const recovered = verifySession<Payload>(token, SECRET);
    expect(recovered).toEqual(payload);
  });

  it('returns null when payload is tampered (one char modified)', () => {
    const token = signSession({ uid: 7, fullname: '我' }, SECRET);
    const [p, s] = token.split('.');
    // Flip one base64url char in the payload half.
    const swapped = p.startsWith('A') ? `B${p.slice(1)}` : `A${p.slice(1)}`;
    const tampered = `${swapped}.${s}`;
    expect(verifySession<Payload>(tampered, SECRET)).toBeNull();
  });

  it('returns null when signature is tampered', () => {
    const token = signSession({ uid: 7, fullname: '我' }, SECRET);
    const [p, s] = token.split('.');
    const swapped = s.startsWith('A') ? `B${s.slice(1)}` : `A${s.slice(1)}`;
    const tampered = `${p}.${swapped}`;
    expect(verifySession<Payload>(tampered, SECRET)).toBeNull();
  });

  it('returns null when verifying with the wrong secret', () => {
    const token = signSession({ uid: 7, fullname: '我' }, SECRET);
    expect(verifySession<Payload>(token, 'b'.repeat(32))).toBeNull();
  });

  it('returns null when token has no `.` separator', () => {
    expect(verifySession<Payload>('not-a-real-token', SECRET)).toBeNull();
  });

  it('returns null when payload.exp is in the past', () => {
    const token = signSession(
      { uid: 7, fullname: '我', exp: Date.now() - 1000 },
      SECRET,
    );
    expect(verifySession<Payload>(token, SECRET)).toBeNull();
  });

  it('accepts a payload whose exp is in the future', () => {
    const payload: Payload = {
      uid: 7,
      fullname: '我',
      exp: Date.now() + 60_000,
    };
    const token = signSession(payload, SECRET);
    expect(verifySession<Payload>(token, SECRET)).toEqual(payload);
  });
});
