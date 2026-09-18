// Pure question-controller rules: hint gating, the hint tier restored from the event log, and the compact
// response stored with each attempt.
import type { AstFlag, Format } from '../../content/ids.ts';
import type { AppEvent } from '../../engine/types.ts';

// Hint gates: tier 1 after the first check or 45 s; each later tier after one more check or 20 s on the previous tier.

/**
 * The word for the button that unlocks a hint on this format, so the gate text names the real action:
 * the editor formats have Run tests + Submit (Run does not count), everything else has one Check button.
 */
export type CheckVerb = 'submit' | 'check';

const SUBMIT_FORMATS: Format[] = ['write', 'fixBug', 'refactor'];

export function checkVerb(format: Format): CheckVerb {
  return SUBMIT_FORMATS.includes(format) ? 'submit' : 'check';
}

export function hintGate(tier: number, checkNo: number, visibleMs: number, shownAt: number[], checksAt: number[], verb: CheckVerb = 'check') {
  if (tier >= 3) return { available: false, text: '' };
  if (tier === 0) {
    const secs = Math.max(0, Math.ceil((45000 - visibleMs) / 1000));
    return { available: checkNo >= 1 || visibleMs >= 45000, text: `after you ${verb} once, or in ${secs} s` };
  }
  const since = visibleMs - (shownAt[tier] ?? 0);
  const secs = Math.max(0, Math.ceil((20000 - since) / 1000));
  return { available: checkNo > (checksAt[tier] ?? 0) || since >= 20000, text: `after you ${verb} again, or in ${secs} s` };
}

/**
 * Highest hint tier already revealed for this question, read back from the append-only log (`hint` events),
 * the same way a shown answer is restored from `reveal` events. A reload must not clear the hint penalty.
 */
export function restoredHintTier(events: readonly AppEvent[], qid: string, hintCount = 3): 0 | 1 | 2 | 3 {
  let tier = 0;
  for (const e of events) {
    if (e.type === 'hint' && e.qid === qid && e.tier > tier) tier = e.tier;
  }
  return Math.max(0, Math.min(3, hintCount, tier)) as 0 | 1 | 2 | 3;
}

/**
 * Checks already spent on this question outside a test, read back from the log (`attempt` events), so the
 * CHECK_LIMIT and the "Show answer" gate survive leaving the page: a student cannot get an extra check by
 * reloading before the last one.
 */
export function restoredChecks(events: readonly AppEvent[], qid: string): { checks: number; failed: number } {
  let checks = 0;
  let failed = 0;
  for (const e of events) {
    if (e.type !== 'attempt' || e.qid !== qid) continue;
    if (e.mode !== 'practice' && e.mode !== 'paper') continue;
    checks++;
    if (!e.correct) failed++;
  }
  return { checks, failed };
}

export function compactResponse(response: unknown): unknown {
  if (response === undefined) return undefined;
  let r = response;
  if (r && typeof r === 'object' && !Array.isArray(r) && 'flags' in (r as object)) {
    const { flags: _flags, ...rest } = r as Record<string, unknown>;
    void _flags;
    r = rest;
  }
  try {
    const s = JSON.stringify(r);
    if (s.length <= 4000) return r;
    if (r && typeof r === 'object' && typeof (r as { code?: unknown }).code === 'string') {
      return { ...(r as object), code: (r as { code: string }).code.slice(0, 3500), truncated: true };
    }
    return { truncated: true, preview: s.slice(0, 3500) };
  } catch {
    return undefined;
  }
}

export function flagsOf(response: unknown): AstFlag[] | undefined {
  const f = (response as { flags?: unknown } | null)?.flags;
  if (!Array.isArray(f)) return undefined;
  const out = new Set<AstFlag>();
  for (const x of f) {
    if (typeof x === 'string') out.add(x as AstFlag);
    else if (x && typeof x === 'object' && typeof (x as { flag?: unknown }).flag === 'string') out.add((x as { flag: AstFlag }).flag);
  }
  return [...out];
}

