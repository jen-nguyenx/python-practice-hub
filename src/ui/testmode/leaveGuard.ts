// Warn before leaving a page mid-test: tab close/reload (beforeunload), in-app links and back/forward (hash changes).
import { useEffect } from 'preact/hooks';

export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    let allowUntil = 0;
    let restoring = false;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    // Ask on in-app link clicks first, so the page never changes behind the question.
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

    // Back/forward or typed URLs. Registered in the capture phase so it runs before the router's listener
    // and can stop it; the previous hash is then restored.
    const onHashChange = (e: HashChangeEvent) => {
      if (restoring) {
        restoring = false;
        e.stopImmediatePropagation();
        return;
      }
      if (Date.now() < allowUntil) {
        allowUntil = 0;
        return;
      }
      if (window.confirm(message)) return;
      e.stopImmediatePropagation();
      let oldHash = '';
      try { oldHash = new URL(e.oldURL).hash; } catch { /* keep empty */ }
      restoring = true;
      location.hash = oldHash || '#/';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    window.addEventListener('hashchange', onHashChange, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('hashchange', onHashChange, true);
    };
  }, [active, message]);
}
