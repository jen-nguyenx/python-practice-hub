// Pure question-controller rules: hint gating and the compact response stored with each attempt.
import type { AstFlag } from '../../content/ids.ts';

// Hint gates: tier 1 after the first check or 45 s; each later tier after one more check or 20 s on the previous tier.

export function hintGate(tier: number, checkNo: number, visibleMs: number, shownAt: number[], checksAt: number[]) {
  if (tier >= 3) return { available: false, text: '' };
  if (tier === 0) {
    const secs = Math.max(0, Math.ceil((45000 - visibleMs) / 1000));
    return { available: checkNo >= 1 || visibleMs >= 45000, text: `after your first check or in ${secs} s` };
  }
  const since = visibleMs - (shownAt[tier] ?? 0);
  const secs = Math.max(0, Math.ceil((20000 - since) / 1000));
  return { available: checkNo > (checksAt[tier] ?? 0) || since >= 20000, text: `after your next check or in ${secs} s` };
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

