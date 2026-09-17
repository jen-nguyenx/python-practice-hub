// App frame: skip link, sticky header, storage warning, main landmark, first-run tour and the shortcut sheet.
// Also applies theme and motion settings to <html>, warms up Python once, and binds "?" to the shortcut sheet.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Route } from '../../app/router.ts';
import { py, store } from '../../app/services.ts';
import { Header } from './Header.tsx';
import { ShortcutSheet } from './ShortcutSheet.tsx';
import { StorageBanner } from './StorageBanner.tsx';
import { Tour } from './Tour.tsx';
import { applyTheme } from './ThemeToggle.tsx';
import { isEditableTarget } from './format.ts';
import { storeReady } from './storeReady.ts';
import { shortcutSheetOpen, tourOpen } from './uiState.ts';
import '../../styles/shell.css';

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

  const skipToMain = (e: MouseEvent) => {
    // Hash routing: a plain "#main" link would change the route, so move focus instead.
    e.preventDefault();
    const main = mainRef.current;
    if (!main) return;
    main.focus();
    main.scrollIntoView();
  };

  return (
    <div class="app">
      <a class="skip-link" href="#main" onClick={skipToMain}>Skip to main content</a>
      <Header route={route} />
      <StorageBanner />
      <main ref={mainRef} class="app-main" id="main" tabIndex={-1} data-route={route.name}>
        {children}
      </main>
      <ShortcutSheet />
      <Tour />
    </div>
  );
}
