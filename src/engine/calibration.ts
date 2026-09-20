// Did what you thought would happen, happen?
//
// Accuracy says how much you got right. Calibration says whether you knew which ones those would be,
// and that is the thing an exam punishes: walking out sure of eight answers that were wrong. Every
// first check carries what the student said beforehand, so the two can simply be counted together.
import type { AppEvent, Confidence } from './types.ts';

export interface CalibrationSide {
  said: Confidence;
  /** Questions answered after saying this. */
  count: number;
  /** How many of those were right. */
  right: number;
  /** right / count, or null when too few to mean anything. */
  rate: number | null;
}

export interface Calibration {
  sure: CalibrationSide;
  unsure: CalibrationSide;
  /** Both sides added up. */
  answered: number;
  /**
   * What the pair says, when it says anything: 'overconfident' when being sure went badly,
   * 'underconfident' when being unsure went well anyway, 'matched' when both lined up.
   */
  verdict: 'overconfident' | 'underconfident' | 'matched' | null;
}

/** Below this, one bad afternoon would read as a habit. */
export const ENOUGH_SAID = 5;
/** Being sure should mean better than this, or the word is not doing any work. */
const SURE_SHOULD_BE = 0.8;
/** Being unsure and still getting this many right means the doubt was misplaced. */
const UNSURE_IS_FINE = 0.75;

function side(said: Confidence, count: number, right: number): CalibrationSide {
  return { said, count, right, rate: count >= ENOUGH_SAID ? right / count : null };
}

export function calibration(events: readonly AppEvent[]): Calibration {
  // One answer per question: the first check is the only one made before seeing a result, and a question
  // practised again later should not count its old prediction twice.
  const seen = new Map<string, { said: Confidence; correct: boolean }>();
  for (const e of events) {
    if (e.type !== 'attempt' || !e.confidence || e.revealed) continue;
    if (seen.has(e.qid)) continue;
    seen.set(e.qid, { said: e.confidence, correct: e.correct });
  }

  let sureN = 0; let sureR = 0; let unsureN = 0; let unsureR = 0;
  for (const row of seen.values()) {
    if (row.said === 'sure') { sureN++; if (row.correct) sureR++; }
    else { unsureN++; if (row.correct) unsureR++; }
  }
  const sure = side('sure', sureN, sureR);
  const unsure = side('unsure', unsureN, unsureR);

  let verdict: Calibration['verdict'] = null;
  if (sure.rate !== null && sure.rate < SURE_SHOULD_BE) verdict = 'overconfident';
  else if (unsure.rate !== null && unsure.rate >= UNSURE_IS_FINE) verdict = 'underconfident';
  else if (sure.rate !== null || unsure.rate !== null) verdict = 'matched';

  return { sure, unsure, answered: sureN + unsureN, verdict };
}
