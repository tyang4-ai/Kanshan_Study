export interface CurrentUser {
  id: 'me' | 'guwanxi';
  displayName: string;
  bio: string;
}

const ME: CurrentUser = { id: 'me', displayName: '我', bio: 'SCU 生物工程' };
const GU: CurrentUser = { id: 'guwanxi', displayName: '顾婉昔', bio: '放射肿瘤学 · 知乎答主 · 演示账号 (虚构)' };

export function getCurrentUser(req?: Request): CurrentUser {
  const id = req?.headers.get('x-kanshan-account') === 'guwanxi' ? 'guwanxi' : 'me';
  return id === 'guwanxi' ? GU : ME;
}
