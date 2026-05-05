import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ResearchTab } from '@/components/floating/ResearchTab';
import { useEditorStore } from '@/lib/store/editor';

const insertContentRun = vi.fn();
const insertContent = vi.fn(() => ({ run: insertContentRun }));
const focus = vi.fn(() => ({ insertContent }));
const chain = vi.fn(() => ({ focus }));

const fakeEditor = { chain } as unknown as Parameters<
  ReturnType<typeof useEditorStore.getState>['setEditor']
>[0];

beforeEach(() => {
  insertContentRun.mockClear();
  insertContent.mockClear();
  focus.mockClear();
  chain.mockClear();
  window.localStorage.clear();
  useEditorStore.getState().setEditor(fakeEditor);
});

afterEach(() => {
  cleanup();
  useEditorStore.getState().setEditor(null);
});

describe('ResearchTab insert gate', () => {
  it('clicking 插入正文 without acknowledgement opens the modal and does NOT insert', () => {
    render(<ResearchTab selection={null} />);
    fireEvent.click(screen.getByTestId('research-insert'));
    expect(screen.getByTestId('trends-confirm-modal')).toBeInTheDocument();
    expect(insertContentRun).not.toHaveBeenCalled();
  });

  it('confirming the modal proceeds with the editor insert', () => {
    render(<ResearchTab selection={null} />);
    fireEvent.click(screen.getByTestId('research-insert'));
    fireEvent.click(screen.getByTestId('trends-confirm-checkbox'));
    fireEvent.click(screen.getByTestId('trends-confirm-confirm'));

    expect(insertContentRun).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('kanshan-trends-acknowledged')).toBeTruthy();
  });

  it('insert proceeds immediately when already acknowledged', () => {
    window.localStorage.setItem('kanshan-trends-acknowledged', new Date().toISOString());
    render(<ResearchTab selection={null} />);
    fireEvent.click(screen.getByTestId('research-insert'));
    expect(screen.queryByTestId('trends-confirm-modal')).not.toBeInTheDocument();
    expect(insertContentRun).toHaveBeenCalledTimes(1);
  });

  it('cancel in modal does not insert', () => {
    render(<ResearchTab selection={null} />);
    fireEvent.click(screen.getByTestId('research-insert'));
    fireEvent.click(screen.getByTestId('trends-confirm-cancel'));
    expect(insertContentRun).not.toHaveBeenCalled();
    expect(screen.queryByTestId('trends-confirm-modal')).not.toBeInTheDocument();
  });
});
