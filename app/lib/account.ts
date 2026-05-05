export interface CurrentUser {
  id: 'me' | 'guwanxi';
  displayName: string;
  bio: string;
}

const ME: CurrentUser = { id: 'me', displayName: '我', bio: 'SCU 生物工程' };
const GU: CurrentUser = { id: 'guwanxi', displayName: '顾婉昔', bio: '放射肿瘤学 · 知乎答主 · 演示账号 (虚构)' };

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

export function getCurrentUser(req?: Request): CurrentUser {
  if (!req) return ME;
  // Header takes precedence (explicit client opt-in via VaultTab fetch).
  const header = req.headers.get('x-kanshan-account');
  if (header === 'guwanxi') return GU;
  if (header === 'me') return ME;
  // Fall back to the kanshan-account cookie set by OnboardingGate guest path,
  // so a fresh guest visitor sees guwanxi's corpus instead of empty 'me'.
  const cookie = readCookie(req, 'kanshan-account');
  if (cookie === 'guwanxi') return GU;
  return ME;
}
