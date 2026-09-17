// Warn before leaving a page mid-test: tab close/reload (beforeunload), in-app links, back/forward, typed URLs and navigate().
//
// Why popstate: the router's hashchange listener is registered at module load, and listeners on `window` run in
// registration order (capture does not jump the queue there). By the time a later hashchange listener runs, the router
// has already switched screens and the test is gone. A fragment navigation fires `popstate` first, before `hashchange`,
// so the guard restores the previous URL there and the router then sees the unchanged hash.
import { useEffect } from 'preact/hooks';

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

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, [active, message]);
}
