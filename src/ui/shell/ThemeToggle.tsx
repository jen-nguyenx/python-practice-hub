// Top bar theme toggle: switches between dark and light from whatever is showing now.
// "System" stays available in Settings. The html data-theme attribute is applied by AppShell from settings.theme.
import { store } from '../../app/services.ts';
import type { Settings } from '../../engine/types.ts';
import { IconButton } from '../components/Button.tsx';

export function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
  // Keeps the browser's own UI (scrollbars, form controls before CSS loads) in step with the theme.
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme === 'system' ? 'light dark' : theme);
}

/** The theme actually on screen, resolving "system" through prefers-color-scheme. */
export function effectiveTheme(theme: Settings['theme']): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function toggleTheme() {
  const next = effectiveTheme(store.settings.value.theme) === 'dark' ? 'light' : 'dark';
  store.updateSettings({ theme: next });
  applyTheme(next);
}

export function ThemeToggle() {
  const now = effectiveTheme(store.settings.value.theme);
  const label = now === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  return <IconButton icon={now === 'dark' ? 'moon' : 'sun'} label={label} tooltip="bottom" class="tb-theme" onClick={toggleTheme} />;
}
