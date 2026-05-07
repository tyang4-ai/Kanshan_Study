import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jieba-wasm uses CommonJS `__dirname` + readFileSync to load its .wasm bundle.
  // Turbopack rewrites __dirname to a virtual path (C:\ROOT\...) and doesn't copy
  // the .wasm asset, causing ENOENT at runtime. Marking it external preserves
  // Node's normal module resolution so __dirname stays real on disk.
  serverExternalPackages: ['jieba-wasm'],
};

export default nextConfig;
