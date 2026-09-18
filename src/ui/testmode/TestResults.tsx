// Results of a finished test: big score, time, bars per topic (or per question type), and a review list whose rows
// open into the question in review mode (description | your answer, marked, with the worked answer).
import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { Ladder, TopicId } from '../../content/ids.ts';
import { FORMAT_LABEL, FORMAT_LADDER } from '../../content/ids.ts';
import { MISTAKES } from '../../content/mistakes.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import { topicProgressAll } from '../../engine/progress.ts';
import type { TopicProgress } from '../../engine/progress.ts';
import { store } from '../../app/services.ts';
import { href } from '../../app/router.ts';
import { FORMAT_COMPONENTS } from '../formats/registry.ts';
import { WorkbenchContext } from '../workbench/context.ts';
import { Button } from '../components/Button.tsx';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { formatClock, formatDuration } from '../report/format.ts';
import { MIDSEM_COUNTS } from './select.ts';
import type { QuestionOutcome, SavedAnswer, TestItem, TestSummary } from './summary.ts';
import { strongNextStep } from './summary.ts';

const RUNG_WORDS: Record<Ladder, string> = { read: 'Reading code', repair: 'Fix or complete', write: 'Writing code' };
const MIDSEM_TOPIC_COUNT = TOPICS.filter((t) => t.midsem).length;

interface BarRow { key: string; name: string; correct: number; total: number; topicId?: TopicId }

export function TestResults({ summary, items, answers, drafts, mode, headingRef, saveError, extra, actions }: {
  summary: TestSummary;
  items: readonly TestItem[];
  answers: ReadonlyMap<number, SavedAnswer>;
  drafts: ReadonlyMap<number, unknown>;
  mode: 'topic-test' | 'midsem';
  headingRef: { current: HTMLHeadingElement | null };
  saveError: string | null;
  extra?: ComponentChildren;
  actions?: ComponentChildren;
}) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const events = store.events.value;
  const settings = store.settings.value;
  const progress = useMemo<Partial<Record<TopicId, TopicProgress>>>(() => {
    try { return topicProgressAll(events, QUESTION_INDEX, settings); } catch { return {}; }
  }, [events, settings]);
  const isLocked = (t: TopicId) => progress[t]?.state === 'locked';

  const byTopic = summary.perTopic.length > 1;
  const rows: BarRow[] = byTopic
    ? summary.perTopic.map((t) => ({ key: t.topicId, name: TOPIC_BY_ID[t.topicId]?.short ?? t.topicId, correct: t.correct, total: t.total, topicId: t.topicId }))
    : (['read', 'repair', 'write'] as const)
      .map((r) => {
        const os = summary.outcomes.filter((o) => FORMAT_LADDER[o.format] === r);
        return { key: r, name: RUNG_WORDS[r], correct: os.filter((o) => o.correct).length, total: os.length };
      })
      .filter((r) => r.total > 0);
  const strong = strongNextStep(summary, { maxCount: MIDSEM_COUNTS[MIDSEM_COUNTS.length - 1], midsemTopics: MIDSEM_TOPIC_COUNT });

  const toggle = (i: number) => {
    const next = new Set(open);
    if (next.has(i)) next.delete(i); else next.add(i);
    setOpen(next);
  };
  const allOpen = open.size === items.length;
  const kind = mode === 'midsem' ? 'Mid-sem practice' : 'Topic test';
  // Questions from topics that are still locked can be reviewed here but not practised yet: say so once, not per row.
  const lockedTopics = summary.perTopic.map((t) => t.topicId).filter((t, i, xs) => xs.indexOf(t) === i && isLocked(t));

  return (
    <div class="tx-page trs">
      <div class="trs-top">
        <section class="tx-card trs-main" aria-labelledby="trs-heading">
          <span class="tx-eyebrow">{kind} · results</span>
          <h1 id="trs-heading" ref={headingRef} tabIndex={-1}>{summary.title}</h1>
          <div class="trs-score" aria-live="polite">
            <span class="trs-big" aria-label={`${summary.correct} of ${summary.total} correct`}>{summary.correct}<span>/{summary.total}</span></span>
            <span class="trs-pct">{summary.percent}%</span>
          </div>
          <p class="trs-status">
            {summary.passed
              ? <span class="tx-pass ok"><Icon name="check" size={14} /> Passed</span>
              : <span class="tx-pass bad"><Icon name="x" size={14} /> Not passed</span>}
            <span>{summary.passMark} of {summary.total} needed to pass</span>
          </p>
          <dl class="trs-facts">
            <div><dt>Time</dt><dd>{formatClock(summary.durationMs)} of {formatClock(summary.limitMs)}</dd></div>
            <div><dt>Answered</dt><dd>{summary.answered}/{summary.total}</dd></div>
            {summary.timedOut ? <div><dd>Time ran out</dd></div> : null}
          </dl>
          {extra ? <div class="trs-extra">{extra}</div> : null}
          {saveError ? <p class="trs-error" role="alert"><Icon name="alert" /> Not saved to your report: {saveError}</p> : null}
          {actions ? <div class="tx-actions">{actions}</div> : null}
        </section>

        <section class="tx-card trs-bars" aria-labelledby="trs-bars-h">
          <h2 id="trs-bars-h" class="tx-eyebrow">{byTopic ? 'By topic' : 'By question type'}</h2>
          {rows.map((r) => {
            const p = r.total ? Math.round((r.correct / r.total) * 100) : 0;
            const weak = p < 70;
            const locked = r.topicId ? isLocked(r.topicId) : false;
            const lockReason = r.topicId ? progress[r.topicId]?.lockReason : undefined;
            return (
              <div class="trs-bar-row" key={r.key}>
                <span class="trs-bar-name"><span>{r.name}</span></span>
                <span class="trs-bar-end">
                  <span class="trs-bar-score">{r.correct}/{r.total} · {p}%</span>
                  {r.topicId && weak && byTopic ? (
                    locked ? (
                      <a class="trs-bar-link locked" href={href.topic(r.topicId)} title={lockReason ? `Not open yet. ${lockReason}` : 'Not open yet'}>
                        <Icon name="lock" size={13} /> Read up<span class="sr-only"> on {r.name}: notes and worked examples</span>
                      </a>
                    ) : (
                      <a class="trs-bar-link" href={href.topic(r.topicId)}>Practise<span class="sr-only"> {r.name}</span> <Icon name="arrowRight" size={13} /></a>
                    )
                  ) : null}
                </span>
                <span class="trs-track" aria-hidden="true"><span class={`trs-fill${weak ? ' weak' : ''}`} style={{ width: `${p}%` }} /></span>
              </div>
            );
          })}
          {strong ? <p class="trs-strong">{strong}</p> : null}
        </section>
      </div>

      <section class="tx-card trs-review-card" aria-labelledby="trs-review-h">
        <div class="tx-card-head">
          <h2 id="trs-review-h">Review your answers</h2>
          <Button size="sm" variant="ghost" onClick={() => setOpen(allOpen ? new Set() : new Set(items.map((_, i) => i)))}>
            {allOpen ? 'Close all' : 'Open all'}
          </Button>
        </div>
        {lockedTopics.length ? (
          <p class="trs-lock-note">
            <Icon name="lock" size={14} />
            <span>
              Every answer is explained below. {lockedTopics.length === summary.perTopic.length ? 'These topics are' : 'Some of these topics are'}
              {' '}not open on your ladder yet, so their practice pages wait until you get there:{' '}
              {lockedTopics.map((t, i) => (
                <span key={t}>{i > 0 ? ', ' : ''}<a href={href.topic(t)}>{TOPIC_BY_ID[t]?.short ?? t}</a></span>
              ))}.
            </span>
          </p>
        ) : null}
        <ol class="trs-list">
          {summary.outcomes.map((o) => (
            <ReviewRow key={o.qid} o={o} item={items[o.index]} answer={answers.get(o.index)} draft={drafts.get(o.index)}
              mode={mode} open={open.has(o.index)} onToggle={() => toggle(o.index)} locked={isLocked(o.topicId)} />
          ))}
        </ol>
      </section>
    </div>
  );
}

function statusOf(o: QuestionOutcome): { tone: 'ok' | 'bad' | 'none'; text: string; icon: 'check' | 'x' | 'dot' } {
  if (!o.answered) return { tone: 'none', text: 'Not answered', icon: 'dot' };
  if (o.correct) return { tone: 'ok', text: 'Correct', icon: 'check' };
  if (o.score > 0) return { tone: 'bad', text: `Partly · ${Math.round(o.score * 100)}%`, icon: 'x' };
  return { tone: 'bad', text: 'Not correct', icon: 'x' };
}

function ReviewRow({ o, item, answer, draft, mode, open, onToggle, locked }: {
  o: QuestionOutcome; item: TestItem; answer?: SavedAnswer; draft: unknown; mode: 'topic-test' | 'midsem';
  open: boolean; onToggle: () => void; locked: boolean;
}) {
  const st = statusOf(o);
  const topic = TOPIC_BY_ID[o.topicId];
  return (
    <li class="trs-item">
      <button type="button" class="trs-row" aria-expanded={open} aria-controls={`trs-rev-${o.index}`} onClick={onToggle}>
        <span class={`trs-ic ${st.tone}`} aria-hidden="true"><Icon name={st.icon} size={14} /></span>
        <span class="trs-title">
          <span class="trs-n">{String(o.index + 1).padStart(2, '0')}</span>
          <span class="trs-title-text">{o.title}</span>
          {o.flagged ? <span class="flag" title="You flagged this question"><Icon name="flag" size={13} /><span class="sr-only"> (flagged)</span></span> : null}
        </span>
        <span class="trs-where">{mode === 'midsem' && topic ? `${topic.short} · ` : ''}{FORMAT_LABEL[o.format]}</span>
        <span class={`trs-st ${st.tone}`}>{st.text}</span>
        <span class="trs-time" title="Time on this question">{o.timeMs >= 1000 ? formatDuration(o.timeMs) : ''}</span>
        <Icon name="chevronRight" size={14} class="trs-chev" />
      </button>
      {open ? (
        <div id={`trs-rev-${o.index}`}>
          <ReviewPanel item={item} answer={answer} draft={answer ? draft : undefined} mode={mode} locked={locked} />
        </div>
      ) : null}
    </li>
  );
}

const noop = () => {};
/** The review panel shows the worked answer itself, so code formats should not repeat the model answer. */
const REVIEW_CONTEXT = { layout: 'simple' as const, pageShowsAnswer: true };

function ReviewPanel({ item, answer, draft, mode, locked }: { item: TestItem; answer?: SavedAnswer; draft: unknown; mode: 'topic-test' | 'midsem'; locked: boolean }) {
  const Comp = FORMAT_COMPONENTS[item.q.format];
  const mistakes = answer ? answer.result.mistakes.map((m) => m.id).filter((id, i, xs) => xs.indexOf(id) === i) : [];
  const topic = TOPIC_BY_ID[item.topicId];
  return (
    <div class="trs-review">
      <div class="trs-review-desc">
        {item.scenario ? <div class="tr-story"><Markdown text={item.scenario.story} /></div> : null}
        <Markdown text={item.q.prompt} class="tr-prompt" />
        {answer?.result.feedback ? <p class="trs-feedback">{answer.result.feedback}</p> : null}
        {mistakes.length ? (
          <div class="trs-wrong">
            <span class="tx-eyebrow">What went wrong</span>
            <ul>{mistakes.map((id) => <li key={id}>{MISTAKES[id]?.label ?? 'Another mistake'}</li>)}</ul>
          </div>
        ) : null}
        <p class="trs-practise">
          {locked
            ? <a href={href.topic(item.topicId)}>Notes and examples for {topic?.short ?? 'this topic'} <Icon name="arrowRight" size={13} /></a>
            : <a href={href.question(item.q.id)}>Practise this question with hints <Icon name="arrowRight" size={13} /></a>}
        </p>
      </div>
      <div class="trs-review-work">
        {!answer ? <p class="trs-feedback">Not answered. The correct answer is shown.</p> : null}
        <WorkbenchContext.Provider value={REVIEW_CONTEXT}>
          <Comp q={item.q} topicId={item.topicId} generated={item.generated} mode={mode} checksLeft={0}
            revealed={true} locked={true} onCheck={noop} draft={draft} onDraft={noop} />
        </WorkbenchContext.Provider>
        <div class="trs-answer">
          <span class="tx-eyebrow">Worked answer</span>
          <Markdown text={item.q.solution.explanation} />
          {/* Parsons already shows the correct order, which is the model answer. */}
          {item.q.solution.code && item.q.format !== 'parsons' ? <CodeBlock code={item.q.solution.code} numbered label="Model answer" /> : null}
        </div>
      </div>
    </div>
  );
}
