// "Test in progress" card on the topic test and exam screens: carry on after a reload, a closed tab or leaving the page.
// Discarding asks first, because it deletes saved answers.
import { useState } from 'preact/hooks';
import { Button } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { plural } from '../report/format.ts';
import { ConfirmDialog } from './ConfirmDialog.tsx';
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
  const [asking, setAsking] = useState(false);
  const timeUp = progressTimeLeft(progress, Date.now()) <= 0;
  const items = pool ? itemsForProgress(progress, pool) : null;
  const missing = pool !== null && items === null;
  const answered = progress.answers.length;
  const total = progress.qids.length;

  return (
    <section class="tx-resume" aria-labelledby="tx-resume-h">
      <div class="tx-resume-text">
        <span class="tx-eyebrow accent">{timeUp ? 'Time ran out' : 'Test in progress'}</span>
        <h2 id="tx-resume-h" class="tx-resume-title">{progress.title || 'Your test'}</h2>
        <p class="tx-resume-meta tx-mono">
          {timeUp ? 'Saved answers still count' : <><TimeLeft startedAt={progress.startedAt} limitMs={progress.durationMin * 60_000} /> left</>}
          {' · '}{answered}/{total} answered
        </p>
        {missing ? <p class="tx-resume-missing"><Icon name="alert" /> Some of its questions are gone, so it cannot continue.</p> : null}
      </div>
      <div class="tx-actions">
        {!missing ? (
          <Button variant="primary" disabled={!items} onClick={() => items && onResume(items)}>
            {pool === null ? 'Loading…' : timeUp ? 'See results' : 'Carry on'} {pool !== null ? <Icon name="arrowRight" /> : null}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => setAsking(true)}>Discard</Button>
      </div>
      <ConfirmDialog
        open={asking}
        title="Discard this test?"
        confirmLabel="Discard test"
        cancelLabel="Keep it"
        danger
        onCancel={() => setAsking(false)}
        onConfirm={() => { setAsking(false); onDiscard(); }}
      >
        <p>{answered > 0 ? `Your ${plural(answered, 'saved answer')} will be deleted` : 'The test will be deleted'} and no score is recorded.</p>
      </ConfirmDialog>
    </section>
  );
}
