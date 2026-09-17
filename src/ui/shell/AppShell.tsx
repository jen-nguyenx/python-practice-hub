// App frame (docs/build/DESIGN.md "Frame"): skip link, 48px title bar, storage warning, 52px icon bar on the left, the
// main landmark, 28px status bar, command palette, first-run tour and the shortcut sheet. Running tests (mainFill) hide
// the title bar and icon bar because they render their own focused bar.
// Also applies theme and motion settings to <html>, warms up Python once, binds "?" to the shortcut sheet and
// Cmd/Ctrl+K or Cmd/Ctrl+P to the command palette.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Route } from '../../app/router.ts';
import { py, store } from '../../app/services.ts';
import { ActivityBar } from './ActivityBar.tsx';
import { CommandPalette } from './CommandPalette.tsx';
import { ShortcutSheet } from './ShortcutSheet.tsx';
import { StatusBar } from './StatusBar.tsx';
import { StorageBanner } from './StorageBanner.tsx';
import { TitleBar } from './TitleBar.tsx';
import { Tour } from './Tour.tsx';
import { applyAccent, applyTheme } from './ThemeToggle.tsx';
import { isEditableTarget } from './format.ts';
import { storeReady } from './storeReady.ts';
import { mainFill, paletteOpen, shortcutSheetOpen, tourOpen } from './uiState.ts';
import '../../styles/shell.css';

/** Routes whose screen fills the workspace height and manages its own scrolling (see docs/build/DESIGN.md "Frame"). */
export const FILL_ROUTES: Route['name'][] = ['playground'];

/** Routes where a tour popping up would get in the way (timed tests). */
const NO_TOUR_ROUTES: Route['name'][] = ['topic-test', 'midsem'];

function scheduleIdle(fn: () => void) {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(fn, { timeout: 1500 });
  else setTimeout(fn, 300);
}

export function AppShell({ route, children }: { route: Route; children: ComponentChildren }) {
  const settings = store.settings.value;
  const ready = storeReady.value;
  const mainRef = useRef<HTMLElement>(null);
  const warmed = useRef(false);

  // Theme and motion on <html>.
  useEffect(() => { applyTheme(settings.theme); }, [settings.theme]);
  useEffect(() => { applyAccent(settings.accent); }, [settings.accent]);
  useEffect(() => {
    const root = document.documentElement;
    if (settings.reducedMotion === 'on') root.setAttribute('data-motion', 'reduce');
    else root.removeAttribute('data-motion');
  }, [settings.reducedMotion]);

  // Start Python once, after the first paint.
  useEffect(() => {
    if (warmed.current) return;
    warmed.current = true;
    scheduleIdle(() => {
      try { py.warmUp(); } catch { /* the pill shows the error state */ }
    });
  }, []);

  // First-run tour.
  useEffect(() => {
    if (ready && !settings.seenTour && !NO_TOUR_ROUTES.includes(route.name) && !tourOpen.value) tourOpen.value = true;
  }, [ready, settings.seenTour, route.name]);

  // "?" opens the shortcut sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (!store.settings.value.singleKeyShortcuts) return;
      if (isEditableTarget(e.target)) return;
      if (document.querySelector('dialog[open]')) return;
      e.preventDefault();
      shortcutSheetOpen.value = true;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Cmd/Ctrl+K and Cmd/Ctrl+P toggle the command palette, from anywhere (capture phase, so editors don't swallow it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k !== 'k' && k !== 'p') return;
      if (!paletteOpen.value && document.querySelector('dialog[open]')) return;
      e.preventDefault();
      e.stopPropagation();
      paletteOpen.value = !paletteOpen.value;
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const fill = FILL_ROUTES.includes(route.name) || mainFill.value;
  const focusMode = mainFill.value;

  const skipToMain = (e: MouseEvent) => {
    // Hash routing: a plain "#main" link would change the route, so move focus instead.
    e.preventDefault();
    const main = mainRef.current;
    if (!main) return;
    main.focus();
    main.scrollIntoView();
  };

  return (
    <div class="app" data-focus={focusMode ? '' : undefined}>
      <a class="skip-link" href="#main" onClick={skipToMain}>Skip to main content</a>
      {focusMode ? null : <TitleBar route={route} />}
      <StorageBanner />
      {focusMode ? null : <ActivityBar route={route} />}
      <main ref={mainRef} class="app-main" id="main" tabIndex={-1} data-route={route.name} data-fill={fill ? '' : undefined}>
        {children}
      </main>
      <StatusBar />
      <CommandPalette />
      <ShortcutSheet />
      <Tour />
    </div>
  );
}
