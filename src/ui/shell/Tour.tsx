// First-run tour: four short steps. Skip, Esc or Done all mark the tour as seen.
import { useState } from 'preact/hooks';
import { store } from '../../app/services.ts';
import { TOPICS } from '../../content/topics.ts';
import { Dialog } from '../components/Dialog.tsx';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import { LogoMark } from './LogoMark.tsx';
import { tourOpen } from './uiState.ts';

const first = TOPICS[0];
const midsemTopics = TOPICS.filter((t) => t.midsem);
const midsemRange = midsemTopics.length
  ? `topics ${Number(midsemTopics[0].num)} to ${Number(midsemTopics[midsemTopics.length - 1].num)}`
  : 'the early topics';

const STEPS: { icon: IconName; title: string; body: string[] }[] = [
  {
    icon: 'layers',
    title: 'Topics open one at a time',
    body: [
      `Start with topic 1, ${first.title}. Each topic shows a minimum, for example "Minimum: 5 solved, 1 coding".`,
      'Open a topic and reach its minimum to unlock the next one. Passing a topic test unlocks it straight away.',
      'Cheat sheets, worked examples and common mistakes are always readable, even on locked topics.',
    ],
  },
  {
    icon: 'check',
    title: 'Answering questions',
    body: [
      'Reading questions have a Check button. Coding questions have Run, to try your code, and Submit, which also runs hidden tests.',
      'Stuck? Hints come in three steps, from a nudge to part of the code.',
      'Show answer is there when you need it. A question you saw the answer to does not count as solved until you solve it on your own.',
    ],
  },
  {
    icon: 'terminal',
    title: 'The Playground',
    body: [
      'A free space to write and run any Python, with input() and saved files.',
      'Use it to test an idea from a lecture or check what a line does.',
    ],
  },
  {
    icon: 'chart',
    title: 'Reports and the mid-sem test',
    body: [
      'Report shows your strengths, your weak spots and the mistakes you repeat.',
      `Mid-sem test is a timed practice test on ${midsemRange}. You get one check per question and see the answers at the end.`,
      'Your progress stays in this browser. Export a backup from Settings now and then.',
    ],
  },
];

export function Tour() {
  const [step, setStep] = useState(0);
  const open = tourOpen.value;

  const finish = () => {
    tourOpen.value = false;
    setStep(0);
    if (!store.settings.value.seenTour) store.updateSettings({ seenTour: true });
  };

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <Dialog
      open={open}
      onClose={finish}
      dismissOnBackdrop={false}
      showClose={false}
      title={<span class="tour-title"><Icon name={s.icon} size={18} /> {s.title}</span>}
      description={<span class="tour-brand"><LogoMark size={20} /> Welcome to PyLadder · Step {step + 1} of {STEPS.length}</span>}
      initialFocus=".tour-primary"
      class="tour"
      footer={
        <>
          <span class="tour-dots" aria-hidden="true">
            {STEPS.map((_, i) => <span key={i} class={`tour-dot${i === step ? ' on' : ''}`} />)}
          </span>
          <span class="spacer" />
          {!last ? <button type="button" class="btn ghost" onClick={finish}>Skip</button> : null}
          {step > 0 ? <button type="button" class="btn" onClick={() => setStep(step - 1)}>Back</button> : null}
          <button type="button" class="btn primary tour-primary" onClick={last ? finish : () => setStep(step + 1)}>
            {last ? 'Done' : 'Next'}
          </button>
        </>
      }
    >
      <div class="tour-body" aria-live="polite">
        {s.body.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </Dialog>
  );
}
