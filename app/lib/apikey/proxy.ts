// Returns the API key to use for downstream DeepSeek calls.
// User's BYO key (Authorization: Bearer sk-...) wins; else app's fallback.

export function proxyAuth(req: Request): string {
  const auth = req.headers.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer sk-')) {
    return auth.slice('bearer '.length);
  }
  const fallback = process.env.DEEPSEEK_API_KEY;
  if (!fallback) throw new Error('No DeepSeek API key available');
  return fallback;
}
