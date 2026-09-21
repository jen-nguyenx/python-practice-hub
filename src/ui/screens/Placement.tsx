// Placement (#/placement): find where to join the ladder by answering, not by asserting.
//
// One question per topic, climbing, stopping as soon as two in a row go wrong. What it grants is access:
// the topics it opens still have to be practised to count, so the ladder keeps meaning what it meant and
// the report has nothing to caveat.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { href, navigate } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { TOPIC_BY_ID, TOPICS } from '../../content/topics.ts';
import { nextStep, placementLadder, placementOutcome } from '../../engine/placement.ts';
import type { PlacementOutcome, PlacementStep } from '../../engine/placement.ts';
import type { GradeResult } from '../../engine/types.ts';
import { Button, LinkButton } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { Skeleton } from '../components/Skeleton.tsx';
import { FORMAT_COMPONENTS } from '../formats/registry.ts';
import { storeReady } from '../shell/storeReady.ts';
import { loadPool } from '../testmode/pool.ts';
import type { TestItem } from '../testmode/summary.ts';
import './placement.css';

type Phase =
  | { at: 'intro' }
  | { at: 'loading' }
  | { at: 'asking' }
  | { at: 'done'; outcome: PlacementOutcome }
  | { at: 'error'; message: string };

export function Placement() {
  const ready = storeReady.value;
  const [phase, setPhase] = useState<Phase>({ at: 'intro' });
  const [results, setResults] = useState<boolean[]>([]);
  const [answered, setAnswered] = useState<{ correct: boolean; topicShort: string } | null>(null);
  const items = useRef(new Map<string, TestItem>());
  const heading = useRef<HTMLHeadingElement>(null);

  const ladder = useMemo(() => placementLadder(QUESTION_INDEX), []);
  const step: PlacementStep | null = phase.at === 'asking' ? nextStep(ladder, results) : null;
  const item = step ? items.current.get(step.qid) : undefined;

  useEffect(() => { heading.current?.focus(); }, [results.length, phase.at]);

  const start = async () => {
    setPhase({ at: 'loading' });
    try {
      // Every topic's chunk, because the check can climb the whole ladder.
      const pool = await loadPool(TOPICS.map((t) => t.id));
      items.current = new Map(pool.map((p) => [p.item.q.id, p.item]));
      if (!ladder.some((s) => items.current.has(s.qid))) {
        setPhase({ at: 'error', message: 'The questions could not be loaded. Check your connection and try again.' });
        return;
      }
      setResults([]);
      setPhase({ at: 'asking' });
    } catch {
      setPhase({ at: 'error', message: 'The questions could not be loaded. Check your connection and try again.' });
    }
  };

  const finish = (all: boolean[]) => {
    const outcome = placementOutcome(ladder, all);
    try {
      store.append({
        type: 'placement',
        throughTopicId: outcome.throughTopicId,
        asked: outcome.asked,
        correct: outcome.correct,
      });
    } catch (err) {
      console.warn('Could not save the placement result', err);
    }
    setPhase({ at: 'done', outcome });
  };

  const onCheck = (result: GradeResult) => {
    if (!step || answered) return;
    setAnswered({ correct: result.correct, topicShort: TOPIC_BY_ID[step.topicId]?.short ?? '' });
  };

  const next = () => {
    if (!answered) return;
    const all = [...results, answered.correct];
    setAnswered(null);
    setResults(all);
    if (nextStep(ladder, all) === null) finish(all);
  };

  if (!ready) return <div class="pl"><Skeleton h={160} /></div>;

  if (phase.at === 'done') {
    const { outcome } = phase;
    return (
      <div class="pl">
        <section class="pl-done">
          <p class="pl-tag">Placement finished</p>
          <h1 class="pl-done-h">{outcome.summary}</h1>
          <p class="pl-done-p">
            {outcome.correct} of {outcome.asked.length} right. Opening a topic is not the same as finishing
            it: each one still needs its minimum before the next unlocks, exactly as before.
          </p>
          <div class="pl-actions">
            <LinkButton href={href.landing()} variant="primary">Go to the topics</LinkButton>
            <LinkButton href={href.plan()} variant="secondary">See the run-in</LinkButton>
          </div>
        </section>
      </div>
    );
  }

  if (phase.at === 'asking' && step && item) {
    const Comp = FORMAT_COMPONENTS[item.q.format];
    const topic = TOPIC_BY_ID[step.topicId];
    return (
      <div class="pl">
        <header class="pl-bar">
          <span class="pl-step num">Topic {step.order} of {ladder.length}</span>
          <span class="pl-rung" aria-hidden="true">
            {ladder.map((s, i) => (
              <span key={s.qid} class={`pl-tick${i < results.length ? (results[i] ? ' ok' : ' no') : ''}${i === results.length ? ' now' : ''}`} />
            ))}
          </span>
          <span class="spacer" />
          <button type="button" class="pl-stop" onClick={() => finish(results)}>Stop here</button>
        </header>

        <section class="pl-card" aria-labelledby="pl-q">
          <p class="pl-topic">{topic?.short ?? step.topicId}</p>
          <h1 class="pl-title" id="pl-q" ref={heading} tabIndex={-1}>{item.q.title}</h1>
          {item.scenario?.story ? <Markdown text={item.scenario.story} class="pl-story" /> : null}
          <Markdown text={item.q.prompt} class="pl-prompt" />
          <div class="pl-answer" role="group" aria-label="Your answer">
            <Comp
              key={item.q.id}
              q={item.q}
              topicId={step.topicId}
              generated={item.generated}
              mode="placement"
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
          <section class={`pl-after${answered.correct ? ' ok' : ' no'}`} role="status" aria-live="polite">
            <p class="pl-verdict">
              <Icon name={answered.correct ? 'check' : 'alert'} size={16} />
              {answered.correct ? `${answered.topicShort} looks fine.` : `Not quite — that is where ${answered.topicShort} starts to bite.`}
            </p>
            <Button variant="primary" onClick={next}>Next<Icon name="arrowRight" size={16} /></Button>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div class="pl">
      <header class="pl-top">
        <h1 class="pl-h1">Where should you start?</h1>
        <p class="pl-lede">
          One question per topic, climbing until two in a row go wrong. Usually five or six questions, and
          nothing is timed.
        </p>
      </header>

      {phase.at === 'error' ? (
        <p class="pl-error" role="alert"><Icon name="alert" size={15} />{phase.message}</p>
      ) : null}

      <section class="pl-intro">
        <ul class="pl-points">
          <li><Icon name="check" size={15} />It opens the topics you answer through, so you can start where you actually are.</li>
          <li><Icon name="check" size={15} />It does not mark anything as done: each topic still needs its minimum.</li>
          <li><Icon name="check" size={15} />Get it wrong and nothing is lost — you can take it again, and a later attempt never closes a topic.</li>
        </ul>
        <div class="pl-actions">
          <Button variant="primary" onClick={start} disabled={phase.at === 'loading'}>
            {phase.at === 'loading' ? 'Getting it ready…' : 'Start'}<Icon name="arrowRight" size={16} />
          </Button>
          <button type="button" class="btn ghost" onClick={() => navigate(href.landing())}>Start at topic 1 instead</button>
        </div>
      </section>
    </div>
  );
}
