// Sticky app header: logo, main navigation (menu button under 760px), runtime pill, shortcuts and theme toggle.
import { useEffect, useRef, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import type { Route } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { Icon } from '../components/Icon.tsx';
import { RuntimePill } from './RuntimePill.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { shortcutSheetOpen } from './uiState.ts';

type NavKey = 'topics' | 'playground' | 'midsem' | 'report' | 'settings';

const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: 'topics', label: 'Topics', href: href.landing() },
  { key: 'playground', label: 'Playground', href: href.playground() },
  { key: 'midsem', label: 'Mid-sem test', href: href.midsem() },
  { key: 'report', label: 'Report', href: href.report() },
  { key: 'settings', label: 'Settings', href: href.settings() },
];

/** aria-current value for a nav item: "page" on the exact page, "true" when inside that section. */
function currentFor(key: NavKey, r: Route): 'page' | 'true' | undefined {
  switch (key) {
    case 'topics':
      if (r.name === 'landing') return 'page';
      return r.name === 'topic' || r.name === 'question' || r.name === 'topic-test' ? 'true' : undefined;
    case 'playground': return r.name === 'playground' ? 'page' : undefined;
    case 'midsem': return r.name === 'midsem' ? 'page' : undefined;
    case 'report':
      if (r.name !== 'report') return undefined;
      return r.topicId ? 'true' : 'page';
    case 'settings': return r.name === 'settings' ? 'page' : undefined;
  }
}

export function Header({ route }: { route: Route }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const singleKey = store.settings.value.singleKeyShortcuts;

  // Close the mobile menu on navigation.
  useEffect(() => { setMenuOpen(false); }, [route]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); menuBtn.current?.focus(); }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (navRef.current?.contains(t) || menuBtn.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [menuOpen]);

  return (
    <header class="app-header">
      <button
        ref={menuBtn}
        type="button"
        class="icon-btn hdr-menu-btn"
        aria-expanded={menuOpen}
        aria-controls="app-nav"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <Icon name={menuOpen ? 'x' : 'menu'} />
      </button>
      <a class="app-logo" href={href.landing()} aria-label="PyLadder home">
        <svg class="app-logo-mark" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="0.75" y="0.75" width="18.5" height="18.5" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" />
          <path d="M6.5 4.5v11M13.5 4.5v11M6.5 8h7M6.5 12h7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <span class="app-logo-text">Py<span>Ladder</span></span>
      </a>
      <nav ref={navRef} id="app-nav" class={`app-nav${menuOpen ? ' open' : ''}`} aria-label="Main">
        {NAV.map((n) => {
          const cur = currentFor(n.key, route);
          return (
            <a key={n.key} href={n.href} aria-current={cur} class={cur ? 'is-current' : undefined}>
              {n.label}
            </a>
          );
        })}
      </nav>
      <div class="hdr-right">
        <RuntimePill />
        <button
          type="button"
          class="icon-btn hdr-keys"
          aria-label="Keyboard shortcuts"
          title={singleKey ? 'Keyboard shortcuts (?)' : 'Keyboard shortcuts'}
          onClick={() => { shortcutSheetOpen.value = true; }}
        >
          <Icon name="keyboard" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
