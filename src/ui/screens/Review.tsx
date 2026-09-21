// Review (#/review): a short session of questions chosen from what you have actually got wrong.
//
// It used to be a page about mistakes with a "Practise this" button, which is the Report's job done a
// second time — and the button led to a full question, ten minutes of work at the moment you wanted five.
// Now opening Review deals half a dozen short questions, one at a time, and says after each one why it
// was picked. Nothing new was written for it: every question is one of the app's own, and every answer is
// graded from data the verifier generated.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { MISTAKES } from '../../content/mistakes.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import { reviewQueue } from '../../engine/review.ts';
import { planSession, sessionSummary } from '../../engine/reviewSession.ts';
import type { SessionOutcome, SessionPick } from '../../engine/reviewSession.ts';
import { Button, LinkButton } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { Skeleton } from '../components/Skeleton.tsx';
import { SessionRunner } from '../review/SessionRunner.tsx';
import { plural } from '../shell/format.ts';
import { safeTopicProgress } from '../shell/progressData.ts';
import { storeReady } from '../shell/storeReady.ts';
import { loadPool } from '../testmode/pool.ts';
import type { TestItem } from '../testmode/summary.ts';
import './review.css';

const SIZE = 6;

type Phase =
  | { at: 'ready' }
  | { at: 'loading' }
  | { at: 'running'; picks: SessionPick[]; items: Map<string, TestItem> }
  | { at: 'done'; outcomes: SessionOutcome[] }
  | { at: 'error'; message: string };

/** What the session is made of, in a line: "two mistakes, one shaky skill, three to prove again". */
function madeOf(picks: readonly SessionPick[]): string {
  const n = (r: SessionPick['reason']) => picks.filter((p) => p.reason === r).length;
  const parts = [
    n('mistake') ? `${plural(n('mistake'), 'mistake')} you have made` : '',
    n('skill') ? `${plural(n('skill'), 'skill')} that ${n('skill') === 1 ? 'keeps' : 'keep'} slipping` : '',
    n('again') ? `${n('again')} to prove again` : '',
  ].filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export function Review() {
  const ready = storeReady.value;
  const events = store.events.value;
  const settings = store.settings.value;
  const [phase, setPhase] = useState<Phase>({ at: 'ready' });

  const progress = useMemo(() => safeTopicProgress(events, settings), [events, settings]);
  const unlocked = useMemo(
    () => Object.values(progress).filter((p) => p.state !== 'locked').map((p) => p.topicId),
    [progress],
  );

  // Recomputed whenever the log changes, so finishing a session leaves a smaller queue behind.
  const picks = useMemo(
    () => (ready ? planSession(events, QUESTION_INDEX, { size: SIZE, unlocked }) : []),
    [ready, events, unlocked],
  );

  // What is waiting but not due yet, so "nothing today" does not read as "nothing ever".
  const resting = useMemo(
    () => (ready ? reviewQueue(events, QUESTION_INDEX, { unlocked }).filter((i) => i.score === 0) : []),
    [ready, events, unlocked],
  );

  const start = async () => {
    setPhase({ at: 'loading' });
    try {
      const topics = [...new Set(picks.map((p) => p.topicId))];
      const pool = await loadPool(topics);
      const byId = new Map(pool.map((p) => [p.item.q.id, p.item]));
      const usable = picks.filter((p) => byId.has(p.qid));
      if (usable.length === 0) {
        setPhase({ at: 'error', message: 'Those questions could not be loaded. Check your connection and try again.' });
        return;
      }
      setPhase({ at: 'running', picks: usable, items: byId });
    } catch {
      setPhase({ at: 'error', message: 'Those questions could not be loaded. Check your connection and try again.' });
    }
  };

  // A finished session scrolls back to the top: the summary is the new top of the page.
  useEffect(() => {
    if (phase.at === 'done') window.scrollTo({ top: 0 });
  }, [phase.at]);

  if (!ready) {
    return <div class="rv"><div class="rv-list" aria-busy="true"><Skeleton h={120} /><Skeleton h={120} /></div></div>;
  }

  if (phase.at === 'running') {
    return (
      <div class="rv rv-in-session">
        <SessionRunner picks={phase.picks} items={phase.items} onDone={(o) => setPhase({ at: 'done', outcomes: o })} />
      </div>
    );
  }

  if (phase.at === 'done') {
    const { outcomes } = phase;
    const wrong = outcomes.filter((o) => !o.correct).length;
    return (
      <div class="rv">
        <section class="rv-done">
          <p class="rv-done-tag">Session finished</p>
          <h1 class="rv-done-h">{sessionSummary(outcomes)}</h1>
          <p class="rv-done-p">
            {wrong === 0
              ? 'Those come back further apart now. Anything you get wrong later turns up here again.'
              : `The ${wrong === 1 ? 'one' : wrong} you missed ${wrong === 1 ? 'comes' : 'come'} back in a day or so — practising ${wrong === 1 ? 'it' : 'them'} now would test what is still on the screen.`}
          </p>
          <div class="rv-done-actions">
            {picks.length > 0 ? <Button variant="primary" onClick={start}>Another {picks.length >= SIZE ? SIZE : picks.length}</Button> : null}
            <LinkButton href={href.report()} variant="secondary">See what changed</LinkButton>
            <LinkButton href={href.landing()} variant="ghost">Back to the topics</LinkButton>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div class="rv">
      <header class="rv-top">
        <h1 class="rv-h1">Review</h1>
        <p class="rv-lede">
          A few short questions drawn from what you have got wrong and what you have not touched in a
          while. No timer, no marks — the point is finding out what stuck.
        </p>
      </header>

      {phase.at === 'error' ? (
        <p class="rv-error" role="alert"><Icon name="alert" size={15} />{phase.message}</p>
      ) : null}

      {picks.length > 0 ? (
        <section class="rv-start">
          <p class="rv-start-n num">{plural(picks.length, 'question')}</p>
          <p class="rv-start-of">{madeOf(picks)}</p>
          <Button variant="primary" onClick={start} disabled={phase.at === 'loading'}>
            {phase.at === 'loading' ? 'Getting them ready…' : 'Start the session'}
            <Icon name="arrowRight" size={16} />
          </Button>
          <p class="rv-start-note">
            About {Math.max(2, Math.round(picks.length * 1.6))} minutes. Every answer counts towards your
            progress, exactly as it would on the question's own page.
          </p>
        </section>
      ) : (
        <div class="tp-empty">
          <p><strong>Nothing to review today.</strong></p>
          <p>
            Questions turn up here a day or so after you get something wrong, and again when something you
            solved has been sitting untouched for a while. Answer a few and come back.
          </p>
          <p><a href={href.landing()}>Go to the topics</a></p>
        </div>
      )}

      {resting.length > 0 ? (
        <section class="rv-resting">
          <h2 class="rv-resting-h">Waiting until tomorrow</h2>
          <p class="rv-resting-p">
            {plural(resting.length, 'mistake')} from today. Practising something minutes after getting it
            wrong tests what you have just read rather than what you have learned.
          </p>
          <ul class="rv-resting-l">
            {resting.map((i) => {
              const topic = i.topicId ? TOPIC_BY_ID[i.topicId] : undefined;
              return (
                <li key={i.mistake}>
                  {MISTAKES[i.mistake]?.label ?? i.mistake}
                  {topic ? <span class="rv-resting-topic">{topic.short}</span> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p class="rv-tool">
        Hit an error somewhere else? <a href={href.decode()}>Decode it here</a>.
      </p>
    </div>
  );
}
