import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  buildMarginSealChit,
  MARGIN_SEAL_OPEN_EVENT,
  type MarginSealOpenDetail,
} from '@/components/compliance/MarginSealChit';
import { MarginSealPopover } from '@/components/compliance/MarginSealPopover';
import { useProvenanceStore } from '@/lib/store/provenance';

describe('buildMarginSealChit', () => {
  it('renders default glyph for each kind', () => {
    expect(buildMarginSealChit('reviewed').textContent).toBe('审');
    expect(buildMarginSealChit('flag').textContent).toBe('疑');
    expect(buildMarginSealChit('sourced').textContent).toBe('据');
  });

  it('attaches role=button + tabindex=0 for accessibility', () => {
    const el = buildMarginSealChit('reviewed');
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('dispatches MARGIN_SEAL_OPEN_EVENT on mousedown with detail payload', () => {
    const el = buildMarginSealChit('flag', '审'); // custom text override
    document.body.appendChild(el);
    const handler = vi.fn();
    document.addEventListener(MARGIN_SEAL_OPEN_EVENT, handler);
    fireEvent.mouseDown(el);
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent<MarginSealOpenDetail>).detail;
    expect(detail.kind).toBe('flag');
    expect(detail.text).toBe('审');
    document.removeEventListener(MARGIN_SEAL_OPEN_EVENT, handler);
    el.remove();
  });

  it('dispatches on Enter and Space keys', () => {
    const el = buildMarginSealChit('sourced');
    document.body.appendChild(el);
    const handler = vi.fn();
    document.addEventListener(MARGIN_SEAL_OPEN_EVENT, handler);
    fireEvent.keyDown(el, { key: 'Enter' });
    fireEvent.keyDown(el, { key: ' ' });
    expect(handler).toHaveBeenCalledTimes(2);
    document.removeEventListener(MARGIN_SEAL_OPEN_EVENT, handler);
    el.remove();
  });
});

describe('MarginSealPopover', () => {
  beforeEach(() => {
    useProvenanceStore.setState({ entries: [] });
  });

  afterEach(() => {
    useProvenanceStore.setState({ entries: [] });
  });

  function dispatchOpen(kind: 'reviewed' | 'flag' | 'sourced', text: string) {
    document.dispatchEvent(
      new CustomEvent(MARGIN_SEAL_OPEN_EVENT, {
        detail: {
          kind,
          text,
          rect: { left: 100, top: 100, right: 120, bottom: 120 },
        },
      }),
    );
  }

  it('renders nothing initially', () => {
    render(<MarginSealPopover />);
    expect(screen.queryByTestId('margin-seal-popover')).toBeNull();
  });

  it('opens with hedge label when chit kind=reviewed and a hedge entry exists', async () => {
    useProvenanceStore.setState({
      entries: [
        {
          id: 'p1',
          kind: 'hedge',
          excerpt: '此药对癌症患者有效',
          fox: 'xin',
          at: 0,
        },
      ],
    });
    render(<MarginSealPopover />);
    dispatchOpen('reviewed', '审');
    await waitFor(() => {
      expect(screen.getByTestId('margin-seal-popover')).toBeInTheDocument();
    });
    expect(screen.getByTestId('margin-seal-popover')).toHaveTextContent('已软化');
    expect(screen.getByTestId('margin-seal-popover-excerpt')).toHaveTextContent(
      '此药对癌症患者有效',
    );
  });

  it('opens with flag label when chit kind=flag', async () => {
    render(<MarginSealPopover />);
    dispatchOpen('flag', '疑');
    await waitFor(() => {
      expect(screen.getByTestId('margin-seal-popover')).toHaveTextContent('待补出处');
    });
  });

  it('opens with sourced label when chit kind=sourced', async () => {
    render(<MarginSealPopover />);
    dispatchOpen('sourced', '据');
    await waitFor(() => {
      expect(screen.getByTestId('margin-seal-popover')).toHaveTextContent('已附引用');
    });
  });

  it('closes when clicking outside the popover', async () => {
    render(<MarginSealPopover />);
    dispatchOpen('reviewed', '审');
    await waitFor(() => {
      expect(screen.getByTestId('margin-seal-popover')).toBeInTheDocument();
    });
    // Wait for the deferred outside-listener install
    await new Promise((r) => setTimeout(r, 5));
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByTestId('margin-seal-popover')).toBeNull();
    });
  });

  it('closes on close-button click', async () => {
    render(<MarginSealPopover />);
    dispatchOpen('reviewed', '审');
    const closeBtn = await screen.findByLabelText('关闭');
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByTestId('margin-seal-popover')).toBeNull();
    });
  });

  it('flag without matching provenance → empty-state heuristic + 看心 重新审一审 button', async () => {
    render(<MarginSealPopover />);
    dispatchOpen('flag', '疑');

    await waitFor(() => {
      expect(screen.getByTestId('margin-seal-popover-empty')).toBeInTheDocument();
    });
    const empty = screen.getByTestId('margin-seal-popover-empty');
    expect(empty.textContent ?? '').toContain('合规风险');
    const rerun = screen.getByTestId('margin-seal-popover-rerun');
    expect(rerun).toBeInTheDocument();
    expect(rerun.textContent ?? '').toContain('看心');
  });

  it('rerun button click closes popover (delegates re-run to floating store)', async () => {
    render(<MarginSealPopover />);
    dispatchOpen('flag', '疑');
    const rerun = await screen.findByTestId('margin-seal-popover-rerun');
    fireEvent.click(rerun);
    await waitFor(() => {
      expect(screen.queryByTestId('margin-seal-popover')).toBeNull();
    });
  });
});

describe('MarginSeal regression — chit click → popover (5/12)', () => {
  beforeEach(() => {
    useProvenanceStore.setState({ entries: [] });
  });
  afterEach(() => {
    useProvenanceStore.setState({ entries: [] });
  });

  it('mousedown on a chit dispatches MARGIN_SEAL_OPEN_EVENT and a mounted popover renders within 100ms', async () => {
    render(<MarginSealPopover />);
    const el = buildMarginSealChit('flag');
    document.body.appendChild(el);

    fireEvent.mouseDown(el);

    await waitFor(
      () => {
        expect(screen.getByTestId('margin-seal-popover')).toBeInTheDocument();
      },
      { timeout: 100 },
    );
    expect(screen.getByTestId('margin-seal-popover')).toHaveAttribute('data-kind', 'flag');
    el.remove();
  });
});
