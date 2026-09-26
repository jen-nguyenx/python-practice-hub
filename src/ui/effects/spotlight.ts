// Cursor spotlight (the pixel "travelling rim"), adapted from Jen's landing page.
// Writes the pointer coordinates that src/styles/spotlight.css reads:
//   --mx/--my  on a surface: pointer coords local to that element, so its pixels are brightest nearest the cursor.
// Only a hovered surface is lit, so only the surfaces under the pointer are written: the innermost one and
// any it sits inside. The lessons page has dozens of cards, and measuring each one on every frame would be
// a layout read per card per frame for light nobody can see.
// Coalesced into one requestAnimationFrame per frame; skipped entirely on touch-only devices.

/** Surfaces that carry the rim. Keep in sync with src/styles/spotlight.css. */
export const SPOTLIGHT_SELECTOR =
  '.tile:not(.is-locked), .hc, .ms-tile, .rf-opt:not(.locked), .rp-stat, .accent-opt, .td-item, .lx-card, .up-card, .sh-step, .sx-quiz';

let installed = false;

export function installSpotlight(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  if (window.matchMedia?.('(hover: none)').matches) return;
  let raf = 0;
  let lastX = 0;
  let lastY = 0;
  let lastTarget: Element | null = null;
  const paint = () => {
    raf = 0;
    const lit: HTMLElement[] = [];
    for (let el = lastTarget?.closest<HTMLElement>(SPOTLIGHT_SELECTOR) ?? null; el; el = el.parentElement?.closest<HTMLElement>(SPOTLIGHT_SELECTOR) ?? null) lit.push(el);
    // Every read, then every write, so setting one surface's coordinates never forces a layout for the next.
    const rects = lit.map((el) => el.getBoundingClientRect());
    lit.forEach((el, i) => {
      el.style.setProperty('--mx', `${Math.round(lastX - rects[i].left)}px`);
      el.style.setProperty('--my', `${Math.round(lastY - rects[i].top)}px`);
    });
  };
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      lastX = e.clientX;
      lastY = e.clientY;
      lastTarget = e.target instanceof Element ? e.target : null;
      if (!raf) raf = requestAnimationFrame(paint);
    },
    { passive: true },
  );
  // Scrolling slides a different card under a pointer that has not moved, and no pointermove says so.
  document.addEventListener(
    'scroll',
    () => {
      if (!lastTarget) return;
      lastTarget = document.elementFromPoint(lastX, lastY);
      if (!raf) raf = requestAnimationFrame(paint);
    },
    { passive: true, capture: true },
  );
}
