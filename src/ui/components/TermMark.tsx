// A glossary word, marked where it is read.
//
// Hover, focus or tap gives the definition without leaving the page — the moment a student needs a word
// explained is the moment they hit it, not later when they think to go and look it up.
//
// The panel is positioned from the mark's own rectangle and drawn fixed to the viewport, because the
// places these marks appear (lesson bodies, question prompts, scrolling panels) all clip their overflow,
// and a definition half-cut-off by its own container would be worse than none.
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { TERM_BY_ID } from '../../content/glossaryIndex.ts';
import { InlineMd } from './Markdown.tsx';

const GAP = 6;
const WIDTH = 320;

export function TermMark({ termId, children }: { termId: string; children: string }) {
  const term = TERM_BY_ID.get(termId);
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  // Escape has to mean "gone", but dismissing also moves focus back to the mark, and focus is one of the
  // things that opens it. Without this the panel closes and reopens in the same tick.
  const dismissed = useRef(false);
  const ref = useRef<HTMLButtonElement>(null);
  const id = useId();

  const place = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    // Kept inside the viewport, and flipped above the word when there is no room below it.
    const left = Math.max(8, Math.min(r.left, window.innerWidth - WIDTH - 8));
    const below = r.bottom + GAP;
    const fitsBelow = below + 180 < window.innerHeight;
    setAt({ left, top: fitsBelow ? below : Math.max(8, r.top - GAP - 180) });
  };

  const show = () => {
    if (dismissed.current) return;
    place();
    setOpen(true);
  };
  const hide = () => setOpen(false);
  /** The pointer or focus has left the word, so a later hover may open it again. */
  const leave = () => { dismissed.current = false; hide(); };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      dismissed.current = true;
      hide();
      ref.current?.focus();
    };
    // Any scroll moves the word out from under its own panel, so the panel goes rather than drifts.
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [open]);

  if (!term) return <>{children}</>;

  return (
    <span class="tm-wrap">
      <button
        ref={ref}
        type="button"
        class="tm"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={leave}
        onFocus={show}
        onBlur={leave}
        onClick={() => { if (open) { dismissed.current = true; hide(); } else { dismissed.current = false; show(); } }}
      >
        {children}
        <span class="sr-only"> (glossary term)</span>
      </button>
      {open && at ? (
        <span
          class="tm-pop"
          id={id}
          role="tooltip"
          style={{ left: `${at.left}px`, top: `${at.top}px`, width: `${WIDTH}px` }}
          // Kept open while the pointer is in the panel, so the link inside it can be reached.
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={leave}
        >
          <span class="tm-term">{term.term}</span>
          <span class="tm-short"><InlineMd text={term.short.replace(/\[\[([a-z0-9-]+)\]\]/g, '$1')} /></span>
          <a class="tm-more" href={href.glossary(term.id)}>In the glossary</a>
        </span>
      ) : null}
    </span>
  );
}
