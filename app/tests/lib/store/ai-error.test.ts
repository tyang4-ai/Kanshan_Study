import { describe, it, expect, beforeEach } from 'vitest';
import { useAiErrorStore } from '@/lib/store/ai-error';

describe('useAiErrorStore', () => {
  beforeEach(() => {
    useAiErrorStore.setState({ current: null });
  });

  it('starts with no current error', () => {
    expect(useAiErrorStore.getState().current).toBeNull();
  });

  it('push() sets current with message + status', () => {
    useAiErrorStore.getState().push({ message: 'boom', status: 500 });
    const e = useAiErrorStore.getState().current;
    expect(e).not.toBeNull();
    expect(e!.message).toBe('boom');
    expect(e!.status).toBe(500);
    expect(typeof e!.id).toBe('number');
    expect(typeof e!.ts).toBe('number');
  });

  it('push() replaces the prior error (single-slot)', () => {
    useAiErrorStore.getState().push({ message: 'first' });
    const firstId = useAiErrorStore.getState().current!.id;
    useAiErrorStore.getState().push({ message: 'second' });
    const second = useAiErrorStore.getState().current!;
    expect(second.message).toBe('second');
    expect(second.id).not.toBe(firstId);
  });

  it('dismiss() clears current', () => {
    useAiErrorStore.getState().push({ message: 'boom' });
    useAiErrorStore.getState().dismiss();
    expect(useAiErrorStore.getState().current).toBeNull();
  });
});
