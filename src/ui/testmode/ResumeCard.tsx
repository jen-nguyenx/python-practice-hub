// "Test in progress" card on the topic test and mid-sem screens: carry on after a reload, a closed tab or leaving the page.
import { TOPIC_BY_ID } from '../../content/topics.ts';
import { Button } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { formatDateTime, plural } from '../report/format.ts';
import type { PoolEntry } from './pool.ts';
import type { TestProgress } from './progress.ts';
import { itemsForProgress, progressTimeLeft } from './progress.ts';
import { TimeLeft } from './TimeLeft.tsx';

export function ResumeCard({ progress, pool, onResume, onDiscard }: {
  progress: TestProgress;
  /** null while questions load */
  pool: readonly PoolEntry[] | null;
  onResume: (items: PoolEntry[]) => void;
  onDiscard: () => void;
}) {
  const now = Date.now();
  const timeUp = progressTimeLeft(progress, now) <= 0;
  const items = pool ? itemsForProgress(progress, pool) : null;
  const missing = pool !== null && items === null;
  const answered = progress.answers.length;
  const topics = [...new Set(items?.map((i) => i.topicId) ?? [])].map((t) => TOPIC_BY_ID[t]?.short ?? t);

  return (
    <section class="card tm-resume" aria-labelledby="tm-resume-h">
      <div class="tm-resume-text">
        <h2 id="tm-resume-h"><Icon name="clock" /> {timeUp ? 'Your last test ran out of time' : 'You have a test in progress'}</h2>
        <p class="muted num">
          Started {formatDateTime(progress.startedAt)} · {answered} of {plural(progress.qids.length, 'question')} answered
          {topics.length ? <> · {topics.slice(0, 3).join(', ')}{topics.length > 3 ? ` and ${topics.length - 3} more` : ''}</> : null}
        </p>
        {timeUp ? (
          <p>The timer kept running while you were away. Your saved answers still count: see your results.</p>
        ) : (
          <p class="num">Time left: <strong><TimeLeft startedAt={progress.startedAt} limitMs={progress.durationMin * 60_000} /></strong>. The timer keeps running until you finish.</p>
        )}
        {missing ? <p class="tm-resume-missing"><Icon name="alert" /> Some questions from that test are no longer available, so it cannot be continued.</p> : null}
      </div>
      <div class="tm-actions">
        <Button variant="primary" disabled={!items} onClick={() => items && onResume(items)}>
          {pool === null ? 'Loading questions…' : timeUp ? 'See results' : 'Carry on with the test'} {pool !== null ? <Icon name="arrowRight" /> : null}
        </Button>
        <Button variant="ghost" onClick={onDiscard}><Icon name="trash" /> Discard it</Button>
      </div>
    </section>
  );
}
