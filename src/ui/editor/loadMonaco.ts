// Dynamic loader for the Monaco chunk, plus the "should we use Monaco here?" check.
export type MonacoModule = typeof import('./monaco.ts');

let promise: Promise<MonacoModule> | null = null;

export function loadMonaco(): Promise<MonacoModule> {
  if (!promise) {
    promise = import('./monaco.ts').catch((err) => {
      promise = null;
      throw err;
    });
  }
  return promise;
}

/** Monaco on devices with a fine pointer and at least 700 px of width; a textarea editor otherwise. */
export function prefersMonaco(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem('pyladder:force-textarea') === '1') return false;
  } catch { /* storage blocked */ }
  return window.matchMedia('(any-pointer: fine)').matches && window.innerWidth >= 700;
}
