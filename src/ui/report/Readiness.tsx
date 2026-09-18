// Readiness card: mid-sem practice results, paper-style accuracy and recursion as three figures,
// then the project rules checklist (check in ink when followed, cross in red when broken).
import { useMemo } from 'preact/hooks';
import type { TopicId } from '../../content/ids.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import type { ReportData, ReportRange } from '../../engine/report.ts';
import type { AppEvent } from '../../engine/types.ts';
import { topicProgressAll } from '../../engine/progress.ts';
import type { TopicProgress } from '../../engine/progress.ts';
import { store } from '../../app/services.ts';
import { href } from '../../app/router.ts';
import { Icon } from '../components/Icon.tsx';
import { lockCopy } from '../testmode/lock.ts';
import { eventsInRange } from './overrides.ts';
import { MOCK_EXAM_MINUTES, MOCK_EXAM_TOTAL_MARKS } from '../testmode/select.ts';
import { pct, plural } from './format.ts';
import { RULE_LABEL } from './words.ts';

/** Questions the student tried in this range, among a set of question ids. */
function triedIn(events: readonly AppEvent[], range: ReportRange, qids: ReadonlySet<string>): number {
  const tried = new Set<string>();
  for (const e of eventsInRange(events, range)) {
    if ((e.type === 'attempt' || e.type === 'reveal') && qids.has(e.qid)) tried.add(e.qid);
  }
  return tried.size;
}

const PAPER_QIDS = new Set(QUESTION_INDEX.filter((q) => q.paper).map((q) => q.qid));
const RECURSION_QIDS = new Set(QUESTION_INDEX.filter((q) => q.topicId === 'recursion').map((q) => q.qid));

export function Readiness({ data, topicId, events = [], range = 'all' }: {
  data: ReportData['readiness']; topicId?: TopicId; events?: readonly AppEvent[]; range?: ReportRange;
}) {
  const showExam = !topicId;
  const showRecursion = !topicId || topicId === 'recursion';
  const rules = data.projectRules.filter((r) => r.ok + r.broken > 0);
  const unchecked = data.projectRules.length - rules.length;
  const allEvents = store.events.value;
  const settings = store.settings.value;
  const progress = useMemo<Partial<Record<TopicId, TopicProgress>>>(() => {
    try { return topicProgressAll(allEvents, QUESTION_INDEX, settings); } catch { return {}; }
  }, [allEvents, settings]);
  // Recursion is a final-exam topic at the top of the ladder: say so plainly rather than link to a locked page.
  const recursionLocked = progress.recursion?.state === 'locked';
  const recursionLock = recursionLocked ? lockCopy(progress, 'recursion') : null;
  // Figures from one or two questions read as if they meant more: show how many they come from.
  const paperTried = useMemo(() => triedIn(events, range, PAPER_QIDS), [events, range]);
  const recursionTried = useMemo(() => triedIn(events, range, RECURSION_QIDS), [events, range]);

  return (
    <div class="rp-card rp-flush">
      <div class="rp-figures">
        {showExam ? (
          <div class="rp-figure">
            <span class="rp-figure-label">Mock final exam</span>
            {data.mockExam.attempts > 0 ? (
              <>
                <span class="rp-figure-num">{pct(data.mockExam.best)} <span class="rp-figure-unit">best</span></span>
                <span class="rp-figure-sub">Last {pct(data.mockExam.last)} · {plural(data.mockExam.attempts, 'paper')}</span>
              </>
            ) : (
              <>
                <span class="rp-figure-num is-empty">Not sat</span>
                <span class="rp-figure-sub">8 questions, {MOCK_EXAM_TOTAL_MARKS} marks, {MOCK_EXAM_MINUTES / 60} hours</span>
              </>
            )}
            <a class="rp-figure-link" href={href.exam()}>{data.mockExam.attempts > 0 ? 'Sit another paper' : 'Sit a paper'}</a>
          </div>
        ) : null}
        {showExam && data.practiceTest.attempts > 0 ? (
          <div class="rp-figure">
            <span class="rp-figure-label">Practice tests</span>
            <span class="rp-figure-num">{pct(data.practiceTest.best)} <span class="rp-figure-unit">best</span></span>
            <span class="rp-figure-sub">Last {pct(data.practiceTest.last)} · {plural(data.practiceTest.attempts, 'attempt')}</span>
            <a class="rp-figure-link" href={href.exam()}>Take another</a>
          </div>
        ) : null}
        <div class="rp-figure">
          <span class="rp-figure-label">Paper-style questions</span>
          <span class={`rp-figure-num${data.paperAccuracy === null ? ' is-empty' : ''}`}>{data.paperAccuracy === null ? 'None yet' : pct(data.paperAccuracy)}</span>
          <span class="rp-figure-sub">{paperTried > 0 ? `From ${plural(paperTried, 'question')} · ` : ''}No Run button, like the final exam</span>
        </div>
        {showRecursion ? (
          <div class="rp-figure">
            <span class="rp-figure-label">Recursion</span>
            <span class={`rp-figure-num${data.recursionAccuracy === null ? ' is-empty' : ''}`}>{data.recursionAccuracy === null ? 'None yet' : pct(data.recursionAccuracy)}</span>
            <span class="rp-figure-sub">{recursionTried > 0 ? `From ${plural(recursionTried, 'question')} · ` : ''}Every recent final has one</span>
            {recursionLock ? (
              <span class="rp-figure-note">
                <Icon name="lock" size={13} />
                <span>Last topic on the ladder, so it is not open yet. {recursionLock.sentence}</span>
              </span>
            ) : topicId !== 'recursion' ? (
              <a class="rp-figure-link" href={href.topic('recursion')}>Practise recursion</a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div class="rp-rules">
        <h3 class="rp-card-title sm">Project rules</h3>
        {rules.length === 0 ? (
          <p class="rp-quiet">Not checked yet. Project questions are in Files and CSV, Project rules and Project simulator.</p>
        ) : (
          <ul class="rp-rule-list" aria-label="How often each project rule was followed or broken">
            {rules.map((r) => {
              const broken = r.broken > 0;
              return (
                <li key={r.rule} class={`rp-rule${broken ? ' bad' : ' ok'}`}>
                  <span class="rp-rule-icon" aria-hidden="true"><Icon name={broken ? 'x' : 'check'} size={14} /></span>
                  <span class="rp-rule-text">
                    <span class="rp-rule-title">{RULE_LABEL[r.rule]?.title ?? r.rule}</span>
                    <span class="rp-rule-why">{RULE_LABEL[r.rule]?.why}</span>
                  </span>
                  <span class="rp-rule-result">
                    {broken ? `Broken ${r.broken === 1 ? 'once' : `${r.broken} times`}` : 'Followed'}
                    <span class="rp-rule-count"> · {r.ok} of {r.ok + r.broken}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {rules.length > 0 && unchecked > 0 ? <p class="rp-faint rp-rules-note">{plural(unchecked, 'rule')} not checked yet in this range.</p> : null}
      </div>
    </div>
  );
}
