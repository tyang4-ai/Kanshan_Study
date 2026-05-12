import 'server-only';
import { pickAssetUrl } from './asset-resolver';

// Server-only resolver: call from a Server Component and pass the URL down
// to WorkspaceShell (client) as a prop. Do NOT import this module from a
// 'use client' file — Next.js will bundle node:fs into the client chunk and
// fail to build.
export function getWorkspaceBgUrl(): string | null {
  // Prefer PNG (Gemini output format from Phase #16.5), fall back to JPG.
  return pickAssetUrl('/art/bg/workspace.png') ?? pickAssetUrl('/art/bg/workspace.jpg');
}
