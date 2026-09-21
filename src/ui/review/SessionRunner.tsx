// A review session: a handful of short questions, one at a time, with the reason each was chosen.
//
// Deliberately not the test runner. A test hides everything until the end because it is measuring you; a
// review says what happened straight away, because it is teaching you. There is no timer, no lock, and no
// score to pass — just the question, what happened, and why it was picked.
import { useEffect, useRef, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { FORMAT_LABEL } from '../../content/ids.ts';
import { MISTAKES } from '../../content/mistakes.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { SessionOutcome, SessionPick } from '../../engine/reviewSession.ts';
import type { GradeResult } from '../../engine/types.ts';
import { Button } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { FORMAT_COMPONENTS } from '../formats/registry.ts';
import type { TestItem } from '../testmode/summary.ts';

export interface SessionRunnerProps {
  picks: readonly SessionPick[];
  items: ReadonlyMap<string, TestItem>;
  onDone: (outcomes: SessionOutcome[]) => void;
}

interface Answered { result: GradeResult; pick: SessionPick }

function compact(response: unknown): unknown {
  if (typeof response === 'string') return response.slice(0, 2000);
  return response;
}

export function SessionRunner({ picks, items, onDone }: SessionRunnerProps) {
  const [at, setAt] = useState(0);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const outcomes = useRef<SessionOutcome[]>([]);
  const startedAt = useRef(Date.now());
  const heading = useRef<HTMLHeadingElement>(null);

  const pick = picks[at];
  const item = pick ? items.get(pick.qid) : undefined;

  // Each question is a new thing to read, so the heading is where focus goes.
  useEffect(() => {
    startedAt.current = Date.now();
    heading.current?.focus();
  }, [at]);

  if (!pick || !item) return null;
  const Comp = FORMAT_COMPONENTS[item.q.format];
  const topic = TOPIC_BY_ID[pick.topicId];
  const last = at === picks.length - 1;

  const onCheck = (result: GradeResult, response: unknown) => {
    if (answered) return;
    const score = Math.max(0, Math.min(1, result.score));
    const mistakes = [...new Set(result.mistakes.map((m) => m.id))];
    try {
      store.append({
        type: 'attempt', qid: item.q.id, topicId: pick.topicId, format: item.q.format, diff: item.q.diff,
        mode: 'practice', checkNo: 1, correct: result.correct, score, credit: score, hintTier: 0,
        revealed: false, timeMs: Math.max(0, Date.now() - startedAt.current), mistakes,
        response: compact(response),
      });
      for (const m of result.mistakes) {
        store.append({ type: 'mistake', qid: item.q.id, topicId: pick.topicId, mistake: m.id, channel: m.channel });
      }
    } catch (err) {
      console.warn('Could not save this answer', err);
    }
    outcomes.current.push({ qid: pick.qid, correct: result.correct, reason: pick.reason });
    setAnswered({ result, pick });
  };

  const next = () => {
    setAnswered(null);
    if (last) onDone(outcomes.current);
    else setAt(at + 1);
  };

  // What went wrong, in the catalogue's words. Only after an answer: before it, it would be the answer.
  const named = answered?.result.mistakes.map((m) => MISTAKES[m.id]).filter(Boolean) ?? [];

  return (
    <div class="rs">
      <header class="rs-bar">
        <ol class="rs-dots" aria-label={`Question ${at + 1} of ${picks.length}`}>
          {picks.map((p, i) => (
            <li
              key={p.qid}
              class={`rs-dot${i < at ? ' done' : ''}${i === at ? ' now' : ''}`}
              aria-current={i === at ? 'step' : undefined}
            />
          ))}
        </ol>
        <span class="rs-count num">{at + 1} of {picks.length}</span>
        <span class="spacer" />
        <a class="rs-leave" href={href.landing()}>Stop for now</a>
      </header>

      <section class="rs-card" aria-labelledby="rs-q">
        <p class="rs-meta">
          <span class="rs-fmt">{FORMAT_LABEL[item.q.format]}</span>
          {topic ? <span class="rs-topic">{topic.short}</span> : null}
        </p>
        <h2 class="rs-title" id="rs-q" ref={heading} tabIndex={-1}>{item.q.title}</h2>
        {item.scenario?.story ? <Markdown text={item.scenario.story} class="rs-story" /> : null}
        <Markdown text={item.q.prompt} class="rs-prompt" />
        <div class="rs-answer" role="group" aria-label="Your answer">
          <Comp
            key={item.q.id}
            q={item.q}
            topicId={pick.topicId}
            generated={item.generated}
            mode="practice"
            checksLeft={answered ? 0 : 1}
            revealed={false}
            locked={!!answered}
            onCheck={onCheck}
            draft={undefined}
            onDraft={() => {}}
          />
        </div>
      </section>

      {answered ? (
        <section class={`rs-after${answered.result.correct ? ' ok' : ' no'}`} role="status" aria-live="polite">
          <p class="rs-verdict">
            <Icon name={answered.result.correct ? 'check' : 'alert'} size={16} />
            {answered.result.correct ? 'Right.' : 'Not this time.'}
            <span class="rs-why">{pick.because}</span>
          </p>
          {named.map((m) => (
            <div key={m.id} class="rs-mistake">
              <p class="rs-mistake-t">{m.label}</p>
              <Markdown text={m.explain} class="rs-md" />
              {m.fix ? <Markdown text={m.fix} class="rs-md" /> : null}
            </div>
          ))}
          <div class="rs-next">
            <Button variant="primary" onClick={next}>
              {last ? 'Finish' : 'Next'}<Icon name="arrowRight" size={16} />
            </Button>
            {!answered.result.correct ? (
              <a class="rs-open" href={href.question(item.q.id)}>
                Open this question for hints and the answer
              </a>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
