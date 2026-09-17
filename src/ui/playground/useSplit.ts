// Resizable two-pane split for the Playground: a percentage for the first pane, remembered in localStorage,
// pointer-draggable and keyboard-adjustable (a focusable role="separator").
import type { RefObject } from 'preact';
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

const KEY = 'pyladder:playground-split';
export const SPLIT_DEFAULT = 60;
export const SPLIT_MIN = 30;
export const SPLIT_MAX = 75;

function clamp(n: number) {
  return Math.round(Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, n)) * 10) / 10;
}

function readSplit(): number {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isFinite(n) && n > 0 ? clamp(n) : SPLIT_DEFAULT;
  } catch {
    return SPLIT_DEFAULT;
  }
}

function writeSplit(n: number) {
  try {
    localStorage.setItem(KEY, String(n));
  } catch {
    /* storage blocked: the split is simply not remembered */
  }
}

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return match;
}

/** `container` is the element the percentage is measured against (the pane body). */
export function useSplit(container: RefObject<HTMLElement>, enabled: boolean) {
  const [split, setSplit] = useState(readSplit);
  const [dragging, setDragging] = useState(false);
  const latest = useRef(split);
  latest.current = split;

  const set = (n: number, save = true) => {
    const v = clamp(n);
    setSplit(v);
    if (save) writeSplit(v);
  };

  const fromPointer = (e: PointerEvent) => {
    const el = container.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0) set(((e.clientX - r.left) / r.width) * 100, false);
  };

  const separatorProps: JSX.HTMLAttributes<HTMLDivElement> = enabled
    ? {
        role: 'separator',
        tabIndex: 0,
        'aria-orientation': 'vertical',
        'aria-label': 'Resize editor and output',
        'aria-valuemin': SPLIT_MIN,
        'aria-valuemax': SPLIT_MAX,
        'aria-valuenow': Math.round(split),
        'aria-valuetext': `Editor ${Math.round(split)} percent`,
        onPointerDown: (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setDragging(true);
        },
        onPointerMove: (e) => {
          if (dragging) fromPointer(e);
        },
        onPointerUp: (e) => {
          if (!dragging) return;
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          setDragging(false);
          writeSplit(latest.current);
        },
        onLostPointerCapture: () => {
          if (dragging) {
            setDragging(false);
            writeSplit(latest.current);
          }
        },
        onDblClick: () => set(SPLIT_DEFAULT),
        onKeyDown: (e) => {
          const step = e.shiftKey ? 10 : 2;
          let n: number | null = null;
          if (e.key === 'ArrowLeft') n = split - step;
          else if (e.key === 'ArrowRight') n = split + step;
          else if (e.key === 'Home') n = SPLIT_MIN;
          else if (e.key === 'End') n = SPLIT_MAX;
          else if (e.key === 'Enter') n = SPLIT_DEFAULT;
          if (n === null) return;
          e.preventDefault();
          set(n);
        },
      }
    : { 'aria-hidden': 'true' };

  return { split, dragging, separatorProps };
}
