// 48px title bar (docs/build/DESIGN.md "Frame"): the logo above the icon bar column, a breadcrumb of the route,
// a search-field style button that opens the command palette, runtime status and the theme toggle.
import { href } from '../../app/router.ts';
import type { Route } from '../../app/router.ts';
import { QUESTION_BY_ID } from '../../content/loadIndex.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import { LESSON_BY_ID } from '../../content/lessons/index.ts';
import { Icon } from '../components/Icon.tsx';
import { IS_MAC } from './format.ts';
import { LogoMark } from './LogoMark.tsx';
import { scenarioTitleOf } from './outline.ts';
import { UnitRuntimePill } from './RuntimePill.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { paletteOpen } from './uiState.ts';
import { store } from '../../app/services.ts';
import { unitOf } from '../../content/units.ts';

export interface Crumb { label: string; href?: string }

/** Breadcrumb trail for a route. The last crumb is the current page. */
export function crumbsFor(r: Route): Crumb[] {
  const topic = (id: string): Crumb => ({ label: TOPIC_BY_ID[id]?.short ?? 'Topic', href: href.topic(id) });
  switch (r.name) {
    case 'landing': return [{ label: 'PyLadder' }];
    case 'topic': return [{ label: 'Topics', href: href.landing() }, { label: TOPIC_BY_ID[r.topicId]?.title ?? 'Topic not found' }];
    case 'question': {
      const q = QUESTION_BY_ID.get(r.qid);
      if (!q) return [{ label: 'Topics', href: href.landing() }, { label: 'Question not found' }];
      const scenario = scenarioTitleOf(q.qid);
      const out: Crumb[] = [topic(q.topicId)];
      if (scenario) out.push({ label: scenario, href: href.topic(q.topicId) });
      out.push({ label: q.title });
      return out;
    }
    case 'playground': return [{ label: 'Playground' }];
    case 'r-playground': return [{ label: 'R Playground' }];
    case 'stat-quiz': return [
      { label: 'Exams', href: href.exam() },
      { label: LESSON_BY_ID[r.lessonId] ? `Quiz: ${LESSON_BY_ID[r.lessonId].title}` : 'Quiz not found' },
    ];
    case 'report': return r.topicId && TOPIC_BY_ID[r.topicId]
      ? [{ label: 'Report', href: href.report() }, { label: TOPIC_BY_ID[r.topicId].short }]
      : [{ label: unitOf(store.settings.value) === 'stat2402' ? 'Progress' : 'Report' }];
    case 'lesson': return [topic(r.topicId), { label: 'Lesson' }];
    case 'lessons': return [{ label: 'Lessons' }];
    case 'review': return [{ label: 'Review' }];
    case 'decode': return [{ label: 'Decode an error' }];
    case 'reference': return [{ label: 'Reference' }];
    case 'plan': return [{ label: 'The run-in' }];
    case 'placement': return [{ label: 'Where to start' }];
    case 'glossary': return [{ label: 'Glossary' }];
    case 'revision': return [{ label: 'Revision pack' }];
    case 'build': return [{ label: 'Project build' }];
    case 'lesson-read': return [
      { label: 'Lessons', href: href.lessons() },
      { label: LESSON_BY_ID[r.lessonId]?.title ?? 'Lesson not found' },
    ];
    case 'topic-test': return [topic(r.topicId), { label: 'Topic test' }];
    case 'exam': return [{ label: 'Exams' }];
    case 'settings': return [{ label: 'Settings' }];
    default: return [{ label: 'Page not found' }];
  }
}

function Breadcrumb({ route }: { route: Route }) {
  const crumbs = crumbsFor(route);
  return (
    <nav class="tb-crumbs" aria-label="Breadcrumb">
      <ol>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} class={last ? 'is-last' : undefined}>
              {i > 0 ? <span class="tb-sep" aria-hidden="true">/</span> : null}
              {c.href && !last
                ? <a href={c.href}>{c.label}</a>
                : <span aria-current={last ? 'page' : undefined}>{c.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function TitleBar({ route }: { route: Route }) {
  // A STAT2402 student has no questions or topics to jump to, only lessons.
  const searchLabel = unitOf(store.settings.value) === 'stat2402' ? 'Search lessons' : 'Go to question or topic';
  return (
    <header class="titlebar">
      <a class="tb-logo" href={href.landing()} aria-label="PyLadder home">
        <LogoMark size={32} />
      </a>
      <Breadcrumb route={route} />
      <div class="tb-tools">
        <button
          type="button"
          class="tb-search"
          aria-label={searchLabel}
          aria-haspopup="dialog"
          aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
          onClick={() => { paletteOpen.value = true; }}
        >
          <Icon name="search" size={16} />
          <span class="tb-search-text">{searchLabel}</span>
          <kbd class="tb-search-kbd" aria-hidden="true">{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <UnitRuntimePill />
        <ThemeToggle />
      </div>
    </header>
  );
}
