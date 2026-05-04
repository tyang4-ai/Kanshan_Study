import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontSize } from '@/components/editor/FontSize';

describe('FontSize extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, TextStyle, FontSize],
      content: '<p>hello world</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('setFontSize applies style attribute to selection', () => {
    editor.commands.selectAll();
    editor.commands.setFontSize('22px');
    const html = editor.getHTML();
    expect(html).toContain('font-size: 22px');
  });

  it('parses font-size from inline style on round-trip', () => {
    editor.commands.setContent('<p><span style="font-size: 18px">sized</span></p>');
    const html = editor.getHTML();
    expect(html).toContain('font-size: 18px');
  });

  it('unsetFontSize removes the style', () => {
    editor.commands.selectAll();
    editor.commands.setFontSize('22px');
    expect(editor.getHTML()).toContain('font-size: 22px');
    editor.commands.selectAll();
    editor.commands.unsetFontSize();
    expect(editor.getHTML()).not.toContain('font-size: 22px');
  });
});
