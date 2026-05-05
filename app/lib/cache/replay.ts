// SSE replay for cache hits — preserves the perceived "live" feel by
// re-emitting cached steps with realistic typewriter pacing.

export interface ReplayStep {
  event: string;
  data: unknown;
  // Optional per-step gap override (ms). Falls back to default.
  gapMs?: number;
}

export interface ReplayOptions {
  defaultGapMs: number;
  finalEvent?: string;     // e.g. 'done' — added at end if not in steps
  finalData?: unknown;     // payload for the final event
}

export function replayStream(
  steps: ReplayStep[],
  opts: ReplayOptions,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          send(step.event, step.data);
          if (i < steps.length - 1) {
            const gap = step.gapMs ?? opts.defaultGapMs;
            await new Promise((r) => setTimeout(r, gap));
          }
        }
        if (opts.finalEvent) send(opts.finalEvent, opts.finalData ?? {});
      } finally {
        controller.close();
      }
    },
  });
}

// Common gap presets — calibrated for the rehearsed demo's screen-share legibility.
export const REPLAY_GAPS = {
  voiceFillIter: 800,
  debateTurn: 1200,
  personaMessage: 600,
} as const;
