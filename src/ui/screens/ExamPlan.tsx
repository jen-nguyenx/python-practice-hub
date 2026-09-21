// The run-in (#/plan): how long is left, what is left, and whether those two match.
//
// The status bar has always said "exams in 35 days" and that was the end of it. This is the page that
// line should have led to: the pace the remaining topics demand, the pace already being managed, and the
// weeks laid out between here and the paper.
import { useMemo } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { examPlan } from '../../engine/examPlan.ts';
import type { PlanTarget, PlanWeek, ReadyItem, Verdict } from '../../engine/examPlan.ts';
import { testHistory } from '../testmode/summary.ts';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import { LinkButton } from '../components/Button.tsx';
import { Skeleton } from '../components/Skeleton.tsx';
import { safeTopicProgress } from '../shell/progressData.ts';
import { storeReady } from '../shell/storeReady.ts';
import './examPlan.css';

const TARGET_ICON: Record<PlanTarget['kind'], IconName> = {
  start: 'ladder', finish: 'ladder', revise: 'refresh', mock: 'clock', exam: 'flag',
};

/** The one word at the top. Colour is carried by a class, never by the word alone. */
const VERDICT_WORD: Record<Verdict, string> = {
  'not-started': 'Not started',
  'on-track': 'On track',
  behind: 'Behind',
  'out-of-time': 'Out of time',
  done: 'Topics finished',
  exams: 'Exams',
};

const VERDICT_TONE: Record<Verdict, string> = {
  'not-started': 'warn', 'on-track': 'ok', behind: 'warn', 'out-of-time': 'bad', done: 'ok', exams: 'ok',
};

function Week({ w }: { w: PlanWeek }) {
  const when = new Date(w.start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return (
    <li class={`xp-week${w.current ? ' is-now' : ''}${w.phase === 'exams' ? ' is-exams' : ''}`}>
      <div class="xp-week-head">
        <span class="xp-week-label">{w.label}</span>
        <span class="xp-week-date num">from {when}</span>
        {w.current ? <span class="xp-now">this week</span> : null}
      </div>
      {w.targets.length === 0 ? (
        <p class="xp-week-free">Nothing scheduled. Revise whatever felt shakiest.</p>
      ) : (
        <ul class="xp-targets">
          {w.targets.map((t, i) => (
            <li key={i} class="xp-target">
              <Icon name={TARGET_ICON[t.kind]} size={15} />
              {t.href ? <a href={t.href}>{t.text}</a> : <span>{t.text}</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Check({ item }: { item: ReadyItem }) {
  return (
    <li class={`xp-check${item.done ? ' is-done' : ''}`}>
      <Icon name={item.done ? 'check' : 'circle'} size={15} />
      <span class="xp-check-text">
        {item.href && !item.done ? <a href={item.href}>{item.text}</a> : item.text}
      </span>
      {item.detail ? <span class="xp-check-detail num">{item.detail}</span> : null}
    </li>
  );
}

export function ExamPlan() {
  const ready = storeReady.value;
  const events = store.events.value;
  const settings = store.settings.value;

  const plan = useMemo(() => {
    if (!ready) return null;
    const progress = safeTopicProgress(events, settings);
    const mocks = testHistory(events, 'mock-exam');
    const best = mocks.length ? Math.max(...mocks.map((m) => m.percent)) / 100 : null;
    return examPlan({
      events,
      index: QUESTION_INDEX,
      progress,
      mockExam: { attempts: mocks.length, best },
    });
  }, [ready, events, settings]);

  if (!plan) {
    return <div class="xp"><Skeleton h={140} /><Skeleton h={220} /></div>;
  }

  const { pace } = plan;
  const tone = VERDICT_TONE[pace.verdict];

  return (
    <div class="xp">
      <header class="xp-top">
        <h1 class="xp-h1">The run-in</h1>
        <p class="xp-lede">
          Everything between now and the paper, worked out from what you have done and how long there is.
        </p>
      </header>

      <section class={`xp-verdict tone-${tone}`} aria-labelledby="xp-v">
        <p class="xp-days num">
          <span class="xp-days-n">{plan.daysToExams}</span>
          <span class="xp-days-w">{plan.daysToExams === 1 ? 'day' : 'days'} to exams</span>
        </p>
        <div class="xp-verdict-text">
          <h2 class="xp-v" id="xp-v">{VERDICT_WORD[pace.verdict]}</h2>
          <p class="xp-say">{plan.verdictText}</p>
        </div>
      </section>

      <section class="xp-nums" aria-label="Where you are">
        <div class="xp-num">
          <span class="xp-num-v num">{pace.done}<span class="xp-num-of">/{pace.done + pace.topicsLeft}</span></span>
          <span class="xp-num-l">topics finished</span>
        </div>
        <div class="xp-num">
          <span class="xp-num-v num">{pace.weeksLeft}</span>
          <span class="xp-num-l">weeks before the study break</span>
        </div>
        <div class="xp-num">
          <span class="xp-num-v num">{pace.needPerWeek}</span>
          <span class="xp-num-l">topics a week needed</span>
        </div>
        <div class="xp-num">
          <span class="xp-num-v num">{pace.ratePerWeek === null ? '—' : (Math.round(pace.ratePerWeek * 10) / 10)}</span>
          <span class="xp-num-l">{pace.ratePerWeek === null ? 'not enough history yet' : 'topics a week so far'}</span>
        </div>
      </section>

      {plan.weeks.length > 0 ? (
        <section class="xp-sec" aria-labelledby="xp-weeks">
          <h2 class="xp-sec-h" id="xp-weeks">Week by week</h2>
          <ol class="xp-weeks">{plan.weeks.map((w) => <Week key={w.start} w={w} />)}</ol>
        </section>
      ) : null}

      <section class="xp-sec" aria-labelledby="xp-ready">
        <h2 class="xp-sec-h" id="xp-ready">Before the paper</h2>
        <ul class="xp-checks">{plan.checklist.map((c) => <Check key={c.id} item={c} />)}</ul>
      </section>

      <div class="xp-actions">
        <LinkButton href={href.landing()} variant="primary">Go to the topics</LinkButton>
        <LinkButton href={href.exam()} variant="secondary">Sit a mock paper</LinkButton>
        <LinkButton href={href.report()} variant="ghost">See the full report</LinkButton>
      </div>
    </div>
  );
}
