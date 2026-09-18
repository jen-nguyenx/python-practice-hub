// Warn before leaving a page mid-test: tab close/reload (beforeunload), in-app links, back/forward, typed URLs and navigate().
//
// Why the Navigation API: `navigate()` in src/app/router.ts sets `location.hash`, which fires neither a click nor a
// popstate, and the router's own hashchange listener is registered first, so a hashchange listener here would only see
// the screen after it had already gone. Chrome's `navigation` "navigate" event fires before any of that and can be
// cancelled, so it covers the command palette and every other programmatic jump. Browsers without it keep the old
// cover (links, back/forward, unload); `allowUntil` stops the two paths asking twice for the same navigation.
//
// Why popstate: the router's hashchange listener is registered at module load, and listeners on `window` run in
// registration order (capture does not jump the queue there). By the time a later hashchange listener runs, the router
// has already switched screens and the test is gone. A fragment navigation fires `popstate` first, before `hashchange`,
// so the guard restores the previous URL there and the router then sees the unchanged hash.
import { useEffect } from 'preact/hooks';

/** The slice of Chrome's NavigateEvent this guard uses. */
interface NavigateEventLike extends Event {
  readonly navigationType?: string;
  readonly destination?: { url?: string };
  readonly downloadRequest?: string | null;
}

export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    let allowUntil = 0;
    let known = location.href;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    // Ask on in-app link clicks before the browser follows them.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as Element | null;
      const a = target && typeof target.closest === 'function' ? target.closest('a[href]') : null;
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('#') || a.getAttribute('target') || href === location.hash) return;
      if (window.confirm(message)) {
        allowUntil = Date.now() + 1500;
      } else {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onPopState = () => {
      if (location.href === known) return;
      if (Date.now() < allowUntil) {
        allowUntil = 0;
        known = location.href;
        return;
      }
      if (window.confirm(message)) {
        known = location.href;
        return;
      }
      // Stay: put the test's URL back before the router's hashchange listener reads it, then undo its scroll-to-top.
      const y = window.scrollY;
      history.replaceState(history.state, '', known);
      const restoreScroll = () => {
        window.removeEventListener('hashchange', restoreScroll);
        window.scrollTo(0, y);
      };
      window.addEventListener('hashchange', restoreScroll);
      window.setTimeout(() => window.removeEventListener('hashchange', restoreScroll), 1000);
    };

    // Programmatic leaves (navigate() from the command palette and anywhere else), plus links and back/forward
    // in browsers that have the Navigation API. Asked here first, so the other handlers pass it through.
    const onNavigate = (ev: Event) => {
      const e = ev as NavigateEventLike;
      if (!e.cancelable || e.defaultPrevented) return;
      if (e.navigationType === 'reload' || e.downloadRequest != null) return; // reloads go through beforeunload
      const url = e.destination?.url;
      if (typeof url !== 'string' || url === location.href) return;
      if (Date.now() < allowUntil) {
        allowUntil = 0;
        known = url;
        return;
      }
      if (window.confirm(message)) {
        allowUntil = Date.now() + 1500;
        known = url;
        return;
      }
      e.preventDefault();
    };
    const navigation = (window as unknown as { navigation?: EventTarget }).navigation;

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    navigation?.addEventListener('navigate', onNavigate);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
      navigation?.removeEventListener('navigate', onNavigate);
    };
  }, [active, message]);
}
