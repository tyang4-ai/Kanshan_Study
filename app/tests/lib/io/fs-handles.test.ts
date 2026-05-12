import { describe, it, expect, afterEach, vi } from 'vitest';
import { supportsFSA, pickFolder } from '@/lib/io/fs-handles';

const original = (window as unknown as Record<string, unknown>).showDirectoryPicker;

afterEach(() => {
  (window as unknown as Record<string, unknown>).showDirectoryPicker = original;
});

describe('supportsFSA', () => {
  it('false when showDirectoryPicker is not on window', () => {
    delete (window as unknown as Record<string, unknown>).showDirectoryPicker;
    expect(supportsFSA()).toBe(false);
  });

  it('true when showDirectoryPicker is on window', () => {
    (window as unknown as Record<string, unknown>).showDirectoryPicker = vi.fn();
    expect(supportsFSA()).toBe(true);
  });
});

describe('pickFolder', () => {
  it('returns null when FSA not supported', async () => {
    delete (window as unknown as Record<string, unknown>).showDirectoryPicker;
    const handle = await pickFolder();
    expect(handle).toBeNull();
  });

  it('returns null on AbortError (user cancelled)', async () => {
    (window as unknown as Record<string, unknown>).showDirectoryPicker = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('cancelled'), { name: 'AbortError' }));
    const handle = await pickFolder();
    expect(handle).toBeNull();
  });

  it('returns the handle on success', async () => {
    const fakeHandle = { kind: 'directory', name: 'fake-folder' };
    (window as unknown as Record<string, unknown>).showDirectoryPicker = vi
      .fn()
      .mockResolvedValue(fakeHandle);
    const handle = await pickFolder();
    expect(handle).toBe(fakeHandle);
  });

  it('propagates non-AbortError failures', async () => {
    (window as unknown as Record<string, unknown>).showDirectoryPicker = vi
      .fn()
      .mockRejectedValue(new Error('boom'));
    await expect(pickFolder()).rejects.toThrow('boom');
  });
});
