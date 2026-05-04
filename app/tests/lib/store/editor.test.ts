import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '@/lib/store/editor';
import type { Editor } from '@tiptap/react';

describe('useEditorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({ editor: null });
  });

  it('starts null', () => {
    expect(useEditorStore.getState().editor).toBeNull();
  });

  it('setEditor stores reference', () => {
    const fake = { id: 'fake' } as unknown as Editor;
    useEditorStore.getState().setEditor(fake);
    expect(useEditorStore.getState().editor).toBe(fake);
  });

  it('setEditor(null) clears', () => {
    const fake = {} as unknown as Editor;
    useEditorStore.getState().setEditor(fake);
    useEditorStore.getState().setEditor(null);
    expect(useEditorStore.getState().editor).toBeNull();
  });
});
