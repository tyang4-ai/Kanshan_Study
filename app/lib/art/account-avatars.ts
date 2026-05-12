import 'server-only';
import { pickAssetUrl } from './asset-resolver';

export interface AccountAvatarUrls {
  readonly me: string | null;
  readonly guwanxi: string | null;
}

// Server-only resolver: call from a Server Component and pass the result
// down to TitleBar (client) as a prop.
export function getAccountAvatarUrls(): AccountAvatarUrls {
  return {
    me: pickAssetUrl('/art/avatars/me.png'),
    guwanxi: pickAssetUrl('/art/avatars/guwanxi.png'),
  };
}
