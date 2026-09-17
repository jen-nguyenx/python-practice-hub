// Hover and keyboard-focus tooltip for one child element. Adds aria-describedby to the child, shows after a short
// delay, hides on Escape, blur or pointer leave. Positioned with position: fixed so scroll containers never clip it.
import { cloneElement } from 'preact';
import type { ComponentChildren, VNode } from 'preact';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import './controls.css';

export type TooltipSide = 'top' | 'bottom' | 'right' | 'left';

export interface TooltipProps {
  content: ComponentChildren;
  /** One element (link, button). It receives aria-describedby and the event handlers. */
  children: VNode<any>;
  side?: TooltipSide;
  /** Alignment along the side: start edge, centre or end edge of the anchor. */
  align?: 'start' | 'center' | 'end';
  /** Hover delay in ms. Keyboard focus shows at once. */
  delay?: number;
  /** Optional keyboard shortcut shown after the text. */
  kbd?: string;
  /** Set when the content only repeats the child's accessible name (no aria-describedby, avoids double reading). */
  decorative?: boolean;
  disabled?: boolean;
}

const GAP = 8;
const MARGIN = 8;

export function Tooltip({ content, children, side = 'top', align = 'center', delay = 350, kbd, decorative, disabled }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLElement | null>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const show = (now: boolean) => {
    clear();
    if (disabled) return;
    if (now) setOpen(true);
    else timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => { clear(); setOpen(false); };

  useEffect(() => () => clear(), []);
  useEffect(() => { if (disabled) hide(); }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    const onScroll = () => hide();
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('keydown', onKey, true); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  useLayoutEffect(() => {
    const t = tip.current;
    const a = anchor.current;
    if (!open || !t || !a) return;
    const r = a.getBoundingClientRect();
    const w = t.offsetWidth;
    const h = t.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let s = side;
    if (s === 'top' && r.top - h - GAP < MARGIN) s = 'bottom';
    else if (s === 'bottom' && r.bottom + h + GAP > vh - MARGIN) s = 'top';
    else if (s === 'right' && r.right + w + GAP > vw - MARGIN) s = 'left';
    else if (s === 'left' && r.left - w - GAP < MARGIN) s = 'right';
    let x: number;
    let y: number;
    if (s === 'top' || s === 'bottom') {
      y = s === 'top' ? r.top - h - GAP : r.bottom + GAP;
      x = align === 'start' ? r.left : align === 'end' ? r.right - w : r.left + r.width / 2 - w / 2;
    } else {
      x = s === 'right' ? r.right + GAP : r.left - w - GAP;
      y = align === 'start' ? r.top : align === 'end' ? r.bottom - h : r.top + r.height / 2 - h / 2;
    }
    x = Math.max(MARGIN, Math.min(x, vw - w - MARGIN));
    y = Math.max(MARGIN, Math.min(y, vh - h - MARGIN));
    t.style.left = `${Math.round(x)}px`;
    t.style.top = `${Math.round(y)}px`;
    t.setAttribute('data-placed', 'true');
  }, [open, side, align]);

  const props = children.props as Record<string, any>;
  const chain = (name: string, fn: (e: any) => void) => (e: any) => { fn(e); props[name]?.(e); };
  const child = cloneElement(children, {
    ref: (el: HTMLElement | null) => {
      anchor.current = el;
      const r = (children as any).ref;
      if (typeof r === 'function') r(el);
      else if (r && typeof r === 'object') r.current = el;
    },
    'aria-describedby': decorative || disabled ? props['aria-describedby'] : [props['aria-describedby'], id].filter(Boolean).join(' '),
    onMouseEnter: chain('onMouseEnter', () => show(false)),
    onMouseLeave: chain('onMouseLeave', hide),
    onFocus: chain('onFocus', (e: FocusEvent) => {
      const el = e.currentTarget as HTMLElement | null;
      let visible = true;
      try { visible = !!el?.matches(':focus-visible'); } catch { /* old browsers: show */ }
      if (visible) show(true);
    }),
    onBlur: chain('onBlur', hide),
    onPointerDown: chain('onPointerDown', hide),
  });

  return (
    <>
      {child}
      {/* Kept in the DOM (hidden) so aria-describedby always resolves. */}
      <span ref={tip} id={id} role="tooltip" class="tt" data-placed="false" hidden={!open}>
        {content}
        {kbd ? <span class="tt-kbd" aria-hidden="true">{kbd}</span> : null}
      </span>
    </>
  );
}
