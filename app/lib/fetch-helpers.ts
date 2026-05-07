'use client';
import { useAiErrorStore } from '@/lib/store/ai-error';

const DEFAULT_MESSAGE = 'LLM 服务暂时不可用，请稍后重试 · 或前往设置自带密钥';

// Wrapped fetch that pushes a single-slot error to the AI-error store on
// non-2xx responses or network failures, then re-throws / returns the
// original Response so callers can still inspect/abort. Aborts (signal
// cancellation) are NOT reported.
export async function fetchWithErrorToast(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      useAiErrorStore.getState().push({
        message: DEFAULT_MESSAGE,
        status: res.status,
        url,
      });
    }
    return res;
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') {
      throw err;
    }
    useAiErrorStore.getState().push({
      message: DEFAULT_MESSAGE,
      url,
    });
    throw err;
  }
}
