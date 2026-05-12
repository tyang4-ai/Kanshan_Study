import { pickAssetUrl } from './asset-resolver';

// Precomputed avatar URLs per demo account. Resolved once at server-module-load
// so client components (TitleBar) can read them without hitting the filesystem.
export const ACCOUNT_AVATAR_URLS: { readonly me: string | null; readonly guwanxi: string | null } = {
  me: pickAssetUrl('/art/avatars/me.png'),
  guwanxi: pickAssetUrl('/art/avatars/guwanxi.png'),
} as const;
