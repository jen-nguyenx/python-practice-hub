// "Report this question": logs a flag event so wrong autograding can be triaged.
import { useState } from 'preact/hooks';
import { store } from '../../app/services.ts';
import { Button } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { Dialog } from './Dialog.tsx';
import { IconButton } from './Tip.tsx';
import './workbench.css';

type Reason = 'wrong-answer' | 'unclear' | 'too-hard' | 'other';
const REASONS: { id: Reason; label: string }[] = [
  { id: 'wrong-answer', label: 'The answer or the tests look wrong' },
  { id: 'unclear', label: 'The question is unclear' },
  { id: 'too-hard', label: 'Too hard for this point in the topic' },
  { id: 'other', label: 'Something else' },
];

export function FlagButton({ qid, variant = 'link' }: { qid: string; variant?: 'icon' | 'link' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('wrong-answer');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <>
      {variant === 'icon' ? (
        <IconButton icon="flag" label="Report this question" side="bottom" align="end" onClick={() => { setOpen(true); setSent(false); }} />
      ) : (
        <button type="button" class="link-btn quiet" onClick={() => { setOpen(true); setSent(false); }}>
          <Icon name="flag" size={13} /> Report this question
        </button>
      )}
      <Dialog open={open} title="Report this question" onClose={() => setOpen(false)}>
        {sent ? (
          <>
            <p>Thanks. The report is saved with your progress and listed in Settings.</p>
            <div class="wb-dialog-actions"><Button variant="primary" onClick={() => setOpen(false)} autoFocus>Close</Button></div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                store.append({ type: 'flag', qid, reason, note: note.trim().slice(0, 1000) });
              } catch (err) {
                console.warn('Could not save the report', err);
              }
              setSent(true);
              setNote('');
            }}
          >
            <fieldset class="flag-reasons">
              <legend>What is wrong?</legend>
              {REASONS.map((r) => (
                <label key={r.id} class="flag-reason">
                  <input type="radio" name="flag-reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <label class="flag-note" for="flag-note">Details (optional)</label>
            <textarea id="flag-note" rows={3} value={note} maxLength={1000} onInput={(e) => setNote(e.currentTarget.value)} />
            <div class="wb-dialog-actions">
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Send report</Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
