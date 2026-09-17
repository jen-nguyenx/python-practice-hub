// Report screen (#/report and #/report/:topicId).
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { TopicId } from '../../content/ids.ts';
import { TOPIC_IDS } from '../../content/ids.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import type { ReportData, ReportRange } from '../../engine/report.ts';
import { buildReport } from '../../engine/report.ts';
import { continueTarget, topicProgressAll } from '../../engine/progress.ts';
import type { AppEvent } from '../../engine/types.ts';
import { store } from '../../app/services.ts';
import { href } from '../../app/router.ts';
import { Button, LinkButton } from '../components/Button.tsx';
import { Callout } from '../components/Callout.tsx';
import { Icon } from '../components/Icon.tsx';
import { ReportBody } from '../report/ReportView.tsx';
import { Segmented } from '../report/Segmented.tsx';
import { formatDate } from '../report/format.ts';
import { eventsForTopic, narrowReport } from '../report/topicFilter.ts';
import '../report/report.css';

const RANGE_KEY = 'pyladder:report-range';
const RANGES: { value: ReportRange; label: string }[] = [
  { value: 'session', label: 'This session' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All time' },
];
const RANGE_WORDS: Record<ReportRange, string> = { session: 'this session', '7d': 'the last 7 days', '30d': 'the last 30 days', all: 'all time' };

function loadRange(): ReportRange {
  try {
    const v = localStorage.getItem(RANGE_KEY);
    return RANGES.some((r) => r.value === v) ? (v as ReportRange) : 'all';
  } catch {
    return 'all';
  }
}

export function Report({ topicId }: { topicId?: string }) {
  return <ReportScreen key={topicId ?? '*'} topicId={topicId} />;
}

/** Print with the light palette and every collapsed section open, then put things back. */
function usePrintMode() {
  useEffect(() => {
    let printing = false;
    let prevTheme: string | null = null;
    let opened: HTMLDetailsElement[] = [];
    const before = () => {
      if (printing) return;
      printing = true;
      const root = document.documentElement;
      prevTheme = root.getAttribute('data-theme');
      root.setAttribute('data-theme', 'light');
      opened = Array.from(document.querySelectorAll<HTMLDetailsElement>('.rp details:not([open])'));
      for (const d of opened) d.open = true;
    };
    const after = () => {
      if (!printing) return;
      printing = false;
      const root = document.documentElement;
      if (prevTheme === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', prevTheme);
      for (const d of opened) d.open = false;
      opened = [];
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);
}

type Built = { ok: true; data: ReportData; events: readonly AppEvent[] } | { ok: false; error: string };

function ReportScreen({ topicId }: { topicId?: string }) {
  const [ready, setReady] = useState(false);
  const [range, setRangeState] = useState<ReportRange>(loadRange);
  const [now] = useState(() => Date.now());
  const events = store.events.value;
  const settings = store.settings.value;
  usePrintMode();

  useEffect(() => {
    let alive = true;
    store.ready.then(() => { if (alive) setReady(true); }, () => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  const validTopic = topicId === undefined || (TOPIC_IDS as readonly string[]).includes(topicId);
  const tid = topicId as TopicId | undefined;
  const meta = tid ? TOPIC_BY_ID[tid] : undefined;

  const built = useMemo((): Built | null => {
    if (!ready || !validTopic) return null;
    try {
      let unlocked: TopicId[];
      try {
        const progress = topicProgressAll(events, QUESTION_INDEX, settings);
        unlocked = TOPICS.filter((t) => (progress[t.id] ? progress[t.id].state !== 'locked' : t.order === 1)).map((t) => t.id);
      } catch {
        unlocked = [TOPICS[0].id];
      }
      const evs = tid ? eventsForTopic(events, tid) : events;
      const index = tid ? QUESTION_INDEX.filter((q) => q.topicId === tid) : QUESTION_INDEX;
      let data = buildReport(evs, index, range, unlocked);
      if (tid) data = narrowReport(data, tid);
      return { ok: true, data, events: evs };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [ready, events, settings, range, tid, validTopic]);

  const setRange = (r: ReportRange) => {
    setRangeState(r);
    try { localStorage.setItem(RANGE_KEY, r); } catch { /* not remembered */ }
  };

  if (!validTopic) {
    return (
      <div class="rp">
        <div class="empty-state">There is no topic called "{topicId}". <a href={href.report()}>Open the full report</a></div>
      </div>
    );
  }

  const resume = (() => {
    try {
      const target = continueTarget(events, QUESTION_INDEX, settings);
      if (target && (!tid || target.topicId === tid)) return href.question(target.qid);
    } catch { /* fall through */ }
    return tid ? href.topic(tid) : href.landing();
  })();

  return (
    <div class="rp">
      <header class="rp-head">
        <div class="rp-title">
          {meta ? (
            <nav class="rp-crumbs muted rp-no-print" aria-label="Breadcrumb">
              <a href={href.report()}>Report</a> <span aria-hidden="true">›</span> {meta.short}
            </nav>
          ) : null}
          <span class="label">{meta ? `Topic ${meta.num} report` : 'Progress report'}</span>
          <h1>{meta ? meta.title : 'Your report'}</h1>
          <p class="muted rp-scope" aria-live="polite">
            Showing {RANGE_WORDS[range]}
            <span class="rp-print-only"> · printed {formatDate(now)}</span>
          </p>
          {meta ? (
            <p class="rp-topic-actions rp-no-print">
              <a href={href.topic(meta.id)}>Open topic</a>
              <a href={href.topicTest(meta.id)}>Take the topic test</a>
              <a href={href.report()}>Full report</a>
            </p>
          ) : null}
        </div>
        <div class="rp-head-actions rp-no-print">
          <Segmented name="rp-range" label="Time range" options={RANGES} value={range} onChange={setRange} />
          <Button onClick={() => window.print()}><Icon name="download" /> Print / Save as PDF</Button>
        </div>
      </header>

      {!ready || !built ? (
        <p class="muted" role="status">Loading your progress…</p>
      ) : !built.ok ? (
        <Callout tone="bad" title="The report could not be built">
          <p>Something went wrong while adding up your progress: {built.error}</p>
          <p>Your practice history is still saved. Try reloading the page.</p>
        </Callout>
      ) : !built.data.hasEnoughData ? (
        <section class="card rp-empty">
          <Icon name="chart" size={28} />
          <h2>Not enough practice {range === 'all' ? (meta ? `in ${meta.short} ` : '') + 'yet' : `in ${RANGE_WORDS[range]}`}</h2>
          <p class="muted">
            Your report fills in after you check answers to a few questions{meta ? ` in ${meta.short}` : ''}. It then shows your strengths, what to work on next, and the mistakes that keep coming up.
          </p>
          <div class="rp-empty-actions">
            <LinkButton href={resume} variant="primary">Start practising <Icon name="arrowRight" /></LinkButton>
            {range !== 'all' ? <Button onClick={() => setRange('all')}>Show all time</Button> : null}
          </div>
        </section>
      ) : (
        <div class="rp-body">
          <ReportBody data={built.data} events={built.events} topicId={tid} now={now} />
        </div>
      )}
    </div>
  );
}
