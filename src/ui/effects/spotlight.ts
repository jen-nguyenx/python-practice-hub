// Cursor spotlight ("travelling rim"), adapted from Jen's landing page.
// Writes pointer coordinates that the rim in src/styles/spotlight.css reads:
//   --xp       on <html>: the pointer's fraction across the viewport (0-1). The rim colour mixes from
//              --accent (left) to --accent-2 (right), so it follows the student's chosen accent preset.
//   --mx/--my  on each surface: pointer coords local to that element, so the rim is brightest nearest the cursor.
// Coalesced into one requestAnimationFrame per frame; skipped entirely on touch-only devices.

/** Surfaces that carry the rim. Keep in sync with src/styles/spotlight.css. */
export const SPOTLIGHT_SELECTOR = '.tile:not(.is-locked), .hc, .ms-tile, .rf-opt:not(.locked), .rp-stat, .accent-opt';

let installed = false;

export function installSpotlight(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  if (window.matchMedia?.('(hover: none)').matches) return;
  const root = document.documentElement;
  let raf = 0;
  let lastX = 0;
  let lastY = 0;
  const paint = () => {
    raf = 0;
    root.style.setProperty('--xp', (lastX / Math.max(1, window.innerWidth)).toFixed(3));
    const els = document.querySelectorAll<HTMLElement>(SPOTLIGHT_SELECTOR);
    const vh = window.innerHeight;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      el.style.setProperty('--mx', `${Math.round(lastX - r.left)}px`);
      el.style.setProperty('--my', `${Math.round(lastY - r.top)}px`);
    }
  };
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    },
    { passive: true },
  );
}
