import { pickAssetUrl } from './asset-resolver';

// Resolved once at server-module-load. Imported by WorkspaceShell (client)
// so Next.js inlines this as a constant during build; no runtime fs access
// happens on the client.
export const WORKSPACE_BG_URL: string | null = pickAssetUrl('/art/bg/workspace.jpg');
