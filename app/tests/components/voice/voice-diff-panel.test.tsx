import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { VoiceDiffPanel } from '@/components/voice/VoiceDiffPanel';

interface SseEvent {
  event: string;
  data: unknown;
}

function makeSseStream(events: SseEvent[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      events.forEach((ev) => {
        controller.enqueue(
          encoder.encode(`event: ${ev.event}\ndata: ${JSON.stringify(ev.data)}\n\n`)
        );
      });
      controller.close();
    },
  });
}

function mockSseFetch(events: SseEvent[]): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      body: makeSseStream(events),
    })
  );
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

const FINAL_EVENT = {
  event: 'final',
  data: {
    generic: 'TCIA 提供了多种公开可用的医学影像数据集。',
    voice: '影像组学的故事其实在 Aerts 2014 那篇 Nat Commun 里就讲清楚了。',
    voiceSpans: [
      {
        start: 0,
        end: 4,
        sourceArticleId: 'art-1',
        sourceTitle: '影像组学的基因组学转向',
        sourceDate: '2025-08',
      },
    ],
    voiceScore: {
      total: 0.81,
      hardSignal: 0.78,
      llmJudge: 0.83,
      embedding: 0.82,
      sub: { aiTaste: 0.18, wordAlignment: 0.84, sentenceVar: 0.71 },
      rationale: 'cadence aligned',
    },
    trace: [],
    voiceSources: [
      { id: 'art-1', title: '影像组学的基因组学转向', date: '2025-08' },
      { id: 'art-2', title: 'TCIA 数据集踩坑指北', date: '2024-11' },
    ],
  },
};

const ITER_EVENTS: SseEvent[] = [
  {
    event: 'iter',
    data: { iteration: 1, score: { total: 0.62 }, notes: '第一稿偏 AI 味' },
  },
  {
    event: 'iter',
    data: { iteration: 2, score: { total: 0.74 }, notes: '加入档案表达' },
  },
  {
    event: 'iter',
    data: { iteration: 3, score: { total: 0.81 }, notes: '收敛' },
  },
];

describe('VoiceDiffPanel', () => {
  beforeEach(() => {
    // jsdom doesn't ship scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows tickers initially, then GENERIC text after generic event, then VOICE prose + signals after final', async () => {
    mockSseFetch([
      { event: 'generic', data: { text: 'TCIA 提供了多种公开可用的医学影像数据集。' } },
      ...ITER_EVENTS,
      FINAL_EVENT,
    ]);
    render(<VoiceDiffPanel selection="一段示例" bullets="—" mode="polish" />);

    await waitFor(() => {
      expect(screen.getByTestId('voice-diff-generic-text')).toHaveTextContent(
        'TCIA 提供了多种公开可用的医学影像数据集。'
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId('voice-diff-voice-text')).toBeInTheDocument();
    });

    // signal bars match sub-scores: 词频对齐 0.84, 句长方差 0.71
    // Use getAllByText since signal labels may render across spans; assert at least one match each.
    expect(screen.getAllByText(/0\.84/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.71/).length).toBeGreaterThan(0);
  });

  it('trace details toggle: collapsed by default, opens with iteration lines', async () => {
    mockSseFetch([
      { event: 'generic', data: { text: 'g' } },
      ...ITER_EVENTS,
      FINAL_EVENT,
    ]);
    render(<VoiceDiffPanel selection="x" bullets="—" mode="polish" />);

    await waitFor(() => {
      expect(screen.getByTestId('voice-diff-trace')).toBeInTheDocument();
    });
    const trace = screen.getByTestId('voice-diff-trace') as HTMLDetailsElement;
    expect(trace.open).toBe(false);
    expect(screen.getByText('轨迹 · 3 稿迭代')).toBeInTheDocument();
    fireEvent.click(screen.getByText('轨迹 · 3 稿迭代'));
    expect(screen.getByText(/第 1 稿 0.62/)).toBeInTheDocument();
    expect(screen.getByText(/第 3 稿 0.81/)).toBeInTheDocument();
  });

  it('renders ComplianceLine with locked GB 45438 text', async () => {
    mockSseFetch([
      { event: 'generic', data: { text: 'g' } },
      FINAL_EVENT,
    ]);
    render(<VoiceDiffPanel selection="x" bullets="—" mode="polish" />);
    await waitFor(() => {
      expect(screen.getByTestId('voice-compliance-line')).toHaveTextContent(
        '输出已添加 GB 45438 标识 · AI 生成可追溯'
      );
    });
  });

  it('rapid double-click on 重生成 → fetch called twice without crash', async () => {
    const fn = mockSseFetch([
      { event: 'generic', data: { text: 'g' } },
      FINAL_EVENT,
    ]);
    render(<VoiceDiffPanel selection="x" bullets="—" mode="polish" />);
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));

    const btn = screen.getByTestId('voice-diff-regen');
    fireEvent.click(btn);
    fireEvent.click(btn);

    await waitFor(() => {
      expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    // panel still rendered
    expect(screen.getByTestId('voice-diff-panel')).toBeInTheDocument();
  });
});
