// Resolve the effective light/dark theme: the root data-theme attribute (what the CSS uses) wins,
// then the saved setting, then the OS preference. Re-renders on any of them changing.
import { useEffect, useState } from 'preact/hooks';
import { store } from '../../app/services.ts';

export type ResolvedTheme = 'light' | 'dark';

export function resolveTheme(): ResolvedTheme {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  const setting = store.settings.value.theme;
  if (setting === 'light' || setting === 'dark') return setting;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useResolvedTheme(): ResolvedTheme {
  const settingTheme = store.settings.value.theme; // subscribe to the settings signal
  const [theme, setTheme] = useState<ResolvedTheme>(resolveTheme);
  useEffect(() => {
    const update = () => setTheme(resolveTheme());
    update();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq.removeEventListener('change', update);
      mo.disconnect();
    };
  }, [settingTheme]);
  return theme;
}
