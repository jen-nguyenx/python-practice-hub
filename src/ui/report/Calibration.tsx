// "How sure were you?" against "were you right?".
//
// Two numbers, side by side, and one sentence about what they mean together. The sentence is the point:
// a student who is right 90% of the time when sure and 40% when unsure is reading themselves well, and
// one who is wrong half the time while sure has a revision problem that accuracy alone never shows.
import type { Calibration as CalibrationData, CalibrationSide } from '../../engine/calibration.ts';
import { ENOUGH_SAID } from '../../engine/calibration.ts';
import { Icon } from '../components/Icon.tsx';
import { pct } from './format.ts';

const SAID: Record<CalibrationSide['said'], string> = {
  sure: 'When you said you were sure',
  unsure: 'When you said you were not sure',
};

const VERDICT: Record<NonNullable<CalibrationData['verdict']>, string> = {
  overconfident:
    'Being sure is not yet a good sign. Before you check an answer you are sure of, look once for the case '
    + 'you have not tried: an empty list, a tie, a number that does not divide.',
  underconfident:
    'You are getting these right while doubting them. The knowledge is there — trust the first answer and '
    + 'spend the saved time on the questions that genuinely look unfamiliar.',
  matched:
    'Your own sense of an answer matches what happens to it. That is worth having: in an exam it tells you '
    + 'which questions to come back to.',
};

function Side({ s }: { s: CalibrationSide }) {
  return (
    <div class="rp-cal-side">
      <span class="rp-cal-said">{SAID[s.said]}</span>
      {s.rate === null ? (
        <span class="rp-cal-quiet">
          {s.count === 0 ? 'Not said yet' : `${s.count} so far — ${ENOUGH_SAID} needed`}
        </span>
      ) : (
        <>
          <span class="rp-cal-rate num">{pct(s.rate)}</span>
          <span class="rp-cal-of num">right · {s.right} of {s.count}</span>
        </>
      )}
    </div>
  );
}

export function Calibration({ data }: { data: CalibrationData }) {
  if (data.answered === 0) {
    return (
      <p class="rp-note-line">
        <Icon name="help" size={14} />
        <span>
          Questions ask how sure you are before the first check. Answer a few and this compares what you
          said with what happened. Settings can switch the question off.
        </span>
      </p>
    );
  }
  return (
    <div class="rp-card rp-cal">
      <div class="rp-cal-sides">
        <Side s={data.sure} />
        <Side s={data.unsure} />
      </div>
      {data.verdict ? <p class="rp-cal-say">{VERDICT[data.verdict]}</p> : null}
    </div>
  );
}
