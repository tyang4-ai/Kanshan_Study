import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WritingSurface } from '@/components/editor/WritingSurface';

function selectFirstTextNodeInside(container: HTMLElement): void {
  // Find the first non-empty text node inside the container, build a Range over
  // it, install it as the document's current selection.
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let textNode: Text | null = null;
  let node = walker.nextNode();
  while (node) {
    if (node.textContent && node.textContent.trim().length > 0) {
      textNode = node as Text;
      break;
    }
    node = walker.nextNode();
  }
  if (!textNode) throw new Error('No text node found in container');

  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, Math.min(2, textNode.textContent!.length));
  // jsdom returns a zero-rect by default — fine, the test just asserts shape.
  range.getBoundingClientRect = () =>
    ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) }) as DOMRect;

  const sel = window.getSelection();
  if (!sel) throw new Error('No selection available');
  sel.removeAllRanges();
  sel.addRange(range);
}

describe('WritingSurface', () => {
  beforeEach(() => {
    window.getSelection()?.removeAllRanges();
  });

  it('renders all 3 hardcoded tab filenames', () => {
    render(<WritingSurface />);
    expect(screen.getByText('影像组学与基因组学.md')).toBeInTheDocument();
    expect(screen.getByText('research-notes.md')).toBeInTheDocument();
    expect(screen.getByText('readme.md')).toBeInTheDocument();
  });

  it('marks the first tab as active', () => {
    render(<WritingSurface />);
    const firstFilename = screen.getByText('影像组学与基因组学.md');
    const tab = firstFilename.closest('[data-testid="tab"]');
    expect(tab).not.toBeNull();
    expect(tab!.getAttribute('data-active')).toBe('true');
  });

  it('renders the editor body as contentEditable', () => {
    render(<WritingSurface />);
    const body = screen.getByTestId('editor-body');
    expect(body.getAttribute('contenteditable')).toBe('true');
  });

  it('skips selection emission while IME is composing', () => {
    const onSelectionChange = vi.fn();
    render(<WritingSurface onSelectionChange={onSelectionChange} />);
    const body = screen.getByTestId('editor-body');

    fireEvent.compositionStart(body);

    selectFirstTextNodeInside(body);
    document.dispatchEvent(new Event('selectionchange'));

    const nonNullCalls = onSelectionChange.mock.calls.filter((c) => c[0] !== null);
    expect(nonNullCalls.length).toBe(0);

    fireEvent.compositionEnd(body);
    selectFirstTextNodeInside(body);
    document.dispatchEvent(new Event('selectionchange'));

    const postComposeCalls = onSelectionChange.mock.calls.filter((c) => c[0] !== null);
    expect(postComposeCalls.length).toBeGreaterThan(0);
    const payload = postComposeCalls[postComposeCalls.length - 1][0] as {
      text: string;
      rect: DOMRect;
    };
    expect(typeof payload.text).toBe('string');
    expect(payload.rect).toBeDefined();
  });

  it('fires onContextMenu with click coords', () => {
    const onContextMenu = vi.fn();
    render(<WritingSurface onContextMenu={onContextMenu} />);
    const body = screen.getByTestId('editor-body');
    // Climb to the outer wrapper that has the onContextMenu handler.
    const outer = body.parentElement;
    expect(outer).not.toBeNull();
    fireEvent.contextMenu(outer!, { clientX: 200, clientY: 300 });
    expect(onContextMenu).toHaveBeenCalledTimes(1);
    const ev = onContextMenu.mock.calls[0][0] as { clientX: number; clientY: number };
    expect(ev.clientX).toBe(200);
    expect(ev.clientY).toBe(300);
  });

  it('emits {text, rect} for non-collapsed selection inside body', () => {
    const onSelectionChange = vi.fn();
    render(<WritingSurface onSelectionChange={onSelectionChange} />);
    const body = screen.getByTestId('editor-body');

    selectFirstTextNodeInside(body);
    document.dispatchEvent(new Event('selectionchange'));

    const truthyCalls = onSelectionChange.mock.calls.filter((c) => c[0] !== null);
    expect(truthyCalls.length).toBeGreaterThan(0);
    const payload = truthyCalls[truthyCalls.length - 1][0];
    expect(payload).toMatchObject({ text: expect.any(String), rect: expect.anything() });
  });

  it('emits null when selection is collapsed (deselect)', () => {
    const onSelectionChange = vi.fn();
    render(<WritingSurface onSelectionChange={onSelectionChange} />);

    window.getSelection()?.removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));

    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });
});
