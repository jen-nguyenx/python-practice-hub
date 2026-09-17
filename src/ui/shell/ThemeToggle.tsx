// Cycles System -> Light -> Dark. The html data-theme attribute is applied by AppShell from settings.theme.
import { store } from '../../app/services.ts';
import type { Settings } from '../../engine/types.ts';
import { Icon } from '../components/Icon.tsx';

const NEXT: Record<Settings['theme'], Settings['theme']> = { system: 'light', light: 'dark', dark: 'system' };
const NAME: Record<Settings['theme'], string> = { system: 'System', light: 'Light', dark: 'Dark' };
const ICON = { system: 'monitor', light: 'sun', dark: 'moon' } as const;

export function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
}

export function ThemeToggle() {
  const theme = store.settings.value.theme;
  const next = NEXT[theme] ?? 'system';
  const label = `Theme: ${NAME[theme] ?? 'System'}. Switch to ${NAME[next]}.`;
  return (
    <button
      type="button"
      class="icon-btn hdr-theme"
      aria-label={label}
      title={label}
      onClick={() => {
        store.updateSettings({ theme: next });
        applyTheme(next);
      }}
    >
      <Icon name={ICON[theme] ?? 'monitor'} />
    </button>
  );
}
