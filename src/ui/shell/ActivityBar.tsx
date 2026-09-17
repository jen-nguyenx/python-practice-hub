// 52px icon bar down the left side (docs/build/DESIGN.md "Frame"): Topics, Playground, Mid-sem test, Report, then Settings
// at the bottom. Muted 20px icons; the current section is ink with a 2px accent bar on its left edge. Under 700px it
// becomes a bottom tab bar with short labels.
import { Fragment } from 'preact';
import { href } from '../../app/router.ts';
import type { Route } from '../../app/router.ts';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import { Tooltip } from '../components/Tooltip.tsx';

export type NavKey = 'topics' | 'playground' | 'tests' | 'report' | 'settings';

export const NAV: { key: NavKey; label: string; short: string; icon: IconName; href: string }[] = [
  { key: 'topics', label: 'Topics', short: 'Topics', icon: 'ladder', href: href.landing() },
  { key: 'playground', label: 'Playground', short: 'Playground', icon: 'code', href: href.playground() },
  { key: 'tests', label: 'Mid-sem practice test', short: 'Test', icon: 'clock', href: href.midsem() },
  { key: 'report', label: 'Report', short: 'Report', icon: 'chart', href: href.report() },
  { key: 'settings', label: 'Settings', short: 'Settings', icon: 'sliders', href: href.settings() },
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

export function ActivityBar({ route }: { route: Route }) {
  return (
    <nav class="actbar" aria-label="Main">
      {NAV.map((n) => {
        const cur = currentFor(n.key, route);
        return (
          <Fragment key={n.key}>
            {n.key === 'settings' ? <span class="actbar-spacer" aria-hidden="true" /> : null}
            <Tooltip content={n.label} side="right" decorative>
              <a href={n.href} class={`actbar-item${cur ? ' is-current' : ''}`} aria-label={n.label} aria-current={cur}>
                <Icon name={n.icon} size={20} />
                <span class="actbar-label" aria-hidden="true">{n.short}</span>
              </a>
            </Tooltip>
          </Fragment>
        );
      })}
    </nav>
  );
}
