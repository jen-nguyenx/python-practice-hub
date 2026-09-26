// 52px icon bar down the left side (docs/build/DESIGN.md "Frame"): Topics, Lessons, Playground, Review, Exams, Report, then Settings
// at the bottom. Muted 20px icons; the current section is ink with a 2px accent bar on its left edge. Under 700px it
// becomes a bottom tab bar with short labels.
import { Fragment } from 'preact';
import { href } from '../../app/router.ts';
import type { Route } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import { Tooltip } from '../components/Tooltip.tsx';

export type NavKey = 'topics' | 'lessons' | 'reference' | 'playground' | 'review' | 'tests' | 'report' | 'settings';

/** `tiny` is the phone label: a bottom bar gives each item about 45px, which "Playground" does not fit. */
export const NAV: { key: NavKey; label: string; short: string; tiny?: string; icon: IconName; href: string }[] = [
  { key: 'topics', label: 'Topics', short: 'Topics', icon: 'ladder', href: href.landing() },
  { key: 'lessons', label: 'Lessons', short: 'Lessons', icon: 'book', href: href.lessons() },
  { key: 'reference', label: 'Look up', short: 'Look up', icon: 'search', href: href.reference() },
  { key: 'playground', label: 'Playground', short: 'Playground', tiny: 'Code', icon: 'code', href: href.playground() },
  { key: 'review', label: 'Review', short: 'Review', icon: 'refresh', href: href.review() },
  { key: 'tests', label: 'Exams', short: 'Exams', icon: 'clock', href: href.exam() },
  { key: 'report', label: 'Progress', short: 'Progress', icon: 'chart', href: href.report() },
  { key: 'settings', label: 'Settings', short: 'Settings', icon: 'sliders', href: href.settings() },
];

/** aria-current value for a nav item: "page" on the exact page, "true" when inside that section. */
export function currentFor(key: NavKey, r: Route): 'page' | 'true' | undefined {
  switch (key) {
    case 'topics':
      if (r.name === 'landing') return 'page';
      return r.name === 'topic' || r.name === 'question' ? 'true' : undefined;
    case 'lessons':
      if (r.name === 'lessons') return 'page';
      return r.name === 'lesson-read' || r.name === 'lesson' ? 'true' : undefined;
    // One door for each pair: the switch at the top of the page moves between the two.
    case 'reference': return r.name === 'reference' || r.name === 'glossary' ? 'page' : undefined;
    case 'playground': return r.name === 'playground' ? 'page' : undefined;
    case 'review': return r.name === 'review' ? 'page' : undefined;
    case 'tests':
      if (r.name === 'exam') return 'page';
      return r.name === 'topic-test' ? 'true' : undefined;
    case 'report':
      if (r.name === 'plan') return 'page';
      if (r.name !== 'report') return undefined;
      return r.topicId ? 'true' : 'page';
    case 'settings': return r.name === 'settings' ? 'page' : undefined;
  }
}

export function ActivityBar({ route }: { route: Route }) {
  const wide = store.settings.value.navExpanded !== false;
  return (
    <nav class={`actbar${wide ? ' is-wide' : ''}`} aria-label="Main">
      <button
        type="button"
        class="actbar-toggle"
        aria-expanded={wide}
        aria-label={wide ? 'Collapse the menu to icons' : 'Expand the menu to show names'}
        title={wide ? 'Collapse the menu' : 'Expand the menu'}
        onClick={() => store.updateSettings({ navExpanded: !wide })}
      >
        <Icon name={wide ? 'chevronLeft' : 'menu'} size={16} />
      </button>
      {NAV.map((n) => {
        const cur = currentFor(n.key, route);
        return (
          <Fragment key={n.key}>
            {n.key === 'settings' ? <span class="actbar-spacer" aria-hidden="true" /> : null}
            {/* The name is beside the icon when the bar is open, so the tooltip would only repeat it. */}
            <Tooltip content={n.label} side="right" decorative disabled={wide}>
              <a href={n.href} class={`actbar-item${cur ? ' is-current' : ''}`} aria-label={n.label} aria-current={cur}>
                <Icon name={n.icon} size={20} />
                {/* Two labels, one shown at a time by width: the accessible name is on the link itself,
                    so neither is ever read out twice. */}
                <span class="actbar-label" aria-hidden="true">{n.short}</span>
                <span class="actbar-tiny" aria-hidden="true">{n.tiny ?? n.short}</span>
              </a>
            </Tooltip>
          </Fragment>
        );
      })}
    </nav>
  );
}
