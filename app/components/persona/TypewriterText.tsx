'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  text: string;
  speed?: number;
  onComplete?: () => void;
  reducedMotion?: boolean;
}

export function TypewriterText({
  text,
  speed = 30,
  onComplete,
  reducedMotion,
}: Props) {
  const [shown, setShown] = useState<string>('');
  const onCompleteRef = useRef<typeof onComplete>(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const prefersReducedMotion =
    reducedMotion ??
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    // Reset on text/speed/reducedMotion change is intentional — fresh typewriter run.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown('');

    if (text.length === 0) {
      const t = setTimeout(() => onCompleteRef.current?.(), 0);
      return () => clearTimeout(t);
    }

    if (prefersReducedMotion) {
      setShown(text);
      const t = setTimeout(() => onCompleteRef.current?.(), 0);
      return () => clearTimeout(t);
    }

    let i = 0;
    const intervalMs = 1000 / speed;
    const handle = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(handle);
        onCompleteRef.current?.();
      }
    }, intervalMs);

    return () => clearInterval(handle);
  }, [text, speed, prefersReducedMotion]);

  const showCursor = !prefersReducedMotion && text.length > 0;

  return (
    <span data-testid="typewriter-text">
      {shown}
      {showCursor && (
        <span
          data-testid="typewriter-cursor"
          style={{ animation: 'pulse 1s infinite', marginLeft: 2 }}
        >
          ▌
        </span>
      )}
    </span>
  );
}
