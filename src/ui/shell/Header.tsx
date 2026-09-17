// Global 64px top bar: logo mark + "PyLadder" + "CITS1401 practice", right-aligned navigation
// (Topics · Playground · Tests · Reports · Settings), runtime status and a quiet theme toggle.
// Under 860px the navigation collapses behind a menu button. Hidden on question pages and running tests.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import type { Route } from '../../app/router.ts';
import { Icon } from '../components/Icon.tsx';
import { LogoMark } from './LogoMark.tsx';
import { RuntimePill } from './RuntimePill.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';

type NavKey = 'topics' | 'playground' | 'tests' | 'report' | 'settings';

const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: 'topics', label: 'Topics', href: href.landing() },
  { key: 'playground', label: 'Playground', href: href.playground() },
  { key: 'tests', label: 'Tests', href: href.midsem() },
  { key: 'report', label: 'Reports', href: href.report() },
  { key: 'settings', label: 'Settings', href: href.settings() },
];

/** aria-current value for a nav item: "page" on the exact page, "true" when inside that section. */
export function currentFor(key: NavKey, r: Route): 'page' | 'true' | undefined {
  switch (key) {
    case 'topics':
      if (r.name === 'landing') return 'page';
      return r.name === 'topic' || r.name === 'question' ? 'true' : undefined;
    case 'playground': return r.name === 'playground' ? 'page' : undefined;
    case 'tests':
      if (r.name === 'midsem') return 'page';
      return r.name === 'topic-test' ? 'true' : undefined;
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

  // Close the mobile menu on navigation.
  useEffect(() => { setMenuOpen(false); }, [route]);

  useLayoutEffect(() => {
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
    <header class="topbar">
      <a class="brand" href={href.landing()} aria-label="PyLadder home">
        <LogoMark />
        <span class="brand-name">PyLadder</span>
        <span class="brand-unit">CITS1401 practice</span>
      </a>
      <nav ref={navRef} id="app-nav" class={`topnav${menuOpen ? ' open' : ''}`} aria-label="Main">
        {NAV.map((n) => {
          const cur = currentFor(n.key, route);
          return (
            <a key={n.key} href={n.href} aria-current={cur} class={cur ? 'is-current' : undefined}>
              {n.label}
            </a>
          );
        })}
      </nav>
      <div class="topbar-tools">
        <RuntimePill />
        <ThemeToggle />
        <button
          ref={menuBtn}
          type="button"
          class="icon-btn topbar-menu"
          aria-expanded={menuOpen}
          aria-controls="app-nav"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name={menuOpen ? 'x' : 'menu'} size={18} />
        </button>
      </div>
    </header>
  );
}
