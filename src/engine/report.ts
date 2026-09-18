// Report aggregations. Pure: everything is derived from the event log and the question index.
import { FORMATS, FORMAT_LADDER, RULE_IDS } from '../content/ids.ts';
import type { Diff, Format, MistakeId, PatternId, RuleId, TopicId } from '../content/ids.ts';
import { MISTAKES } from '../content/mistakes.ts';
import { PATTERNS } from '../content/patterns.ts';
import type { PatternCard } from '../content/patterns.ts';
import type { QuestionMeta } from '../content/questionIndex.ts';
import { TOPICS, TOPIC_BY_ID } from '../content/topics.ts';
import { RULE_MISTAKE } from './grade.ts';
import { questionStats, sessionSummaries, sortedByTs } from './progress.ts';
import type { AppEvent } from './types.ts';
import { clamp01, mean, median } from './util/stats.ts';
import { joinAnd, pct, plural } from './util/text.ts';

export type ReportRange = 'session' | '7d' | '30d' | 'all';
export type Rung = 'read' | 'repair' | 'write';

/**
 * Definitions used throughout (all "question" counts are distinct question ids):
 * - A question "tried" in the range has an attempt or a reveal in the range.
 * - Score / accuracy = mean over tried questions of the best credit (score x hint multiplier, 0 if the answer was revealed).
 * - firstTryRate = share of attempted questions whose first attempt in the range was correct.
 * - hintRate = share of tried questions where any hint was viewed; revealRate = share where the answer was shown.
 * - hintReliance (topics) = share of tried questions that needed hint 2 or 3, or the answer.
 */
export interface ReportData {
  range: ReportRange;
  hasEnoughData: boolean;
  totals: { questions: number; attempts: number; sessions: number; focusedMinutes: number; accuracy: number | null; firstTryRate: number | null; hintRate: number | null; revealRate: number | null };
  headline: { strengths: string[]; workOn: { text: string; href: string }[] };
  topics: {
    topicId: TopicId; attempted: number; total: number; score: number | null;
    byDiff: Record<Diff, { attempted: number; correct: number }>;
    hintReliance: number | null; lastTs: number | null; label: 'strong' | 'weak' | 'ok' | 'not-started';
    reasons: string[];
  }[];
  ladder: { topicId: TopicId; read: number | null; repair: number | null; write: number | null }[];
  mistakes: { id: MistakeId; count: number; questions: number; sessions: number; recent14d: number; lastTs: number; medianFixMs: number | null; exampleQid: string | null }[];
  formats: { format: Format; attempted: number; accuracy: number | null; medianTimeSec: number | null }[];
  sessions: { sessionId: string; start: number; end: number; durationMin: number; questions: number; accuracy: number | null; newMistakes: MistakeId[]; topics: TopicId[] }[];
  trend: { sessionId: string; start: number; accuracy: number | null }[];
  patterns: { id: PatternId; status: 'recommended' | 'using' | 'later'; triggerCount: number }[];
  readiness: {
    paperAccuracy: number | null;
    /** Custom timed practice tests over chosen topics. */
    practiceTest: { best: number | null; last: number | null; attempts: number };
    /** Full mock final papers: eight questions, 100 marks, two hours. */
    mockExam: { best: number | null; last: number | null; attempts: number };
    recursionAccuracy: number | null;
    projectRules: { rule: RuleId; ok: number; broken: number }[];
  };
  behaviour: { rushed: number; stuckNoHint: number; hintSkims: number; revealedWithoutExplain: number };
}

type AttemptEvent = Extract<AppEvent, { type: 'attempt' }>;

const DAY = 86_400_000;
const WINDOW_14D = 14 * DAY;
const MIN_FOR_STRONG = 5;
const MIN_FOR_WEAK_SCORE = 3;

const PROJECT_RULES: readonly RuleId[] = RULE_IDS.filter((r) => r !== 'noLoops');

interface QuestionAgg {
  qid: string;
  topicId: TopicId;
  format: Format | null;
  diff: Diff | null;
  attempts: number;
  bestCredit: number;
  anyCorrect: boolean;
  firstCorrect: boolean | null;
  maxHint: number;
  revealed: boolean;
  paper: boolean;
  lastTs: number;
}

export interface MistakeOccurrence { id: MistakeId; ts: number; qid: string | null; topicId: TopicId | null; sessionId: string }

/**
 * Every mistake occurrence: `mistake` events, plus attempt.mistakes that have no matching mistake event
 * (same session, question and id within 5 s), so older logs and controller variations are not double counted.
 */
export function mistakeOccurrences(events: readonly AppEvent[]): MistakeOccurrence[] {
  const sorted = sortedByTs(events);
  const out: MistakeOccurrence[] = [];
  const logged = new Map<string, number[]>();
  for (const e of sorted) {
    if (e.type !== 'mistake') continue;
    out.push({ id: e.mistake, ts: e.ts, qid: e.qid, topicId: e.topicId, sessionId: e.sessionId });
    const key = `${e.sessionId}|${e.qid}|${e.mistake}`;
    const list = logged.get(key);
    if (list) list.push(e.ts);
    else logged.set(key, [e.ts]);
  }
  for (const e of sorted) {
    if (e.type !== 'attempt' || !Array.isArray(e.mistakes)) continue;
    for (const id of new Set(e.mistakes)) {
      const list = logged.get(`${e.sessionId}|${e.qid}|${id}`);
      const i = list ? list.findIndex((ts) => Math.abs(ts - e.ts) <= 5000) : -1;
      if (list && i >= 0) list.splice(i, 1);
      else out.push({ id, ts: e.ts, qid: e.qid, topicId: e.topicId, sessionId: e.sessionId });
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}

function filterRange(sorted: readonly AppEvent[], range: ReportRange, now: number): readonly AppEvent[] {
  switch (range) {
    case 'all':
      return sorted;
    case '7d':
      return sorted.filter((e) => e.ts >= now - 7 * DAY);
    case '30d':
      return sorted.filter((e) => e.ts >= now - 30 * DAY);
    case 'session': {
      let sid: string | null = null;
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].type === 'attempt') {
          sid = sorted[i].sessionId;
          break;
        }
      }
      if (sid === null && sorted.length > 0) sid = sorted[sorted.length - 1].sessionId;
      return sorted.filter((e) => e.sessionId === sid);
    }
  }
}

function aggregateQuestions(rangeEvents: readonly AppEvent[], meta: ReadonlyMap<string, QuestionMeta>): Map<string, QuestionAgg> {
  const out = new Map<string, QuestionAgg>();
  const get = (qid: string, topicId: TopicId): QuestionAgg => {
    let a = out.get(qid);
    if (!a) {
      const m = meta.get(qid);
      a = {
        qid, topicId, format: m?.format ?? null, diff: m?.diff ?? null, attempts: 0, bestCredit: 0, anyCorrect: false,
        firstCorrect: null, maxHint: 0, revealed: false, paper: !!m?.paper, lastTs: 0,
      };
      out.set(qid, a);
    }
    return a;
  };
  for (const e of rangeEvents) {
    if (e.type === 'attempt') {
      const a = get(e.qid, e.topicId);
      a.format = e.format ?? a.format;
      a.diff = e.diff ?? a.diff;
      if (a.attempts === 0) a.firstCorrect = !!e.correct && !e.revealed;
      a.attempts++;
      if (e.correct) a.anyCorrect = true;
      const credit = e.revealed ? 0 : clamp01(Number(e.credit));
      if (credit > a.bestCredit) a.bestCredit = credit;
      a.maxHint = Math.max(a.maxHint, Number(e.hintTier) || 0);
      if (e.revealed) a.revealed = true;
      if (e.mode === 'paper') a.paper = true;
      a.lastTs = Math.max(a.lastTs, e.ts);
    } else if (e.type === 'reveal') {
      const a = get(e.qid, e.topicId);
      a.revealed = true;
      a.lastTs = Math.max(a.lastTs, e.ts);
    }
  }
  // Hints alone do not make a question "tried", but count toward hint use once it is (including hints before the first attempt).
  for (const e of rangeEvents) {
    if (e.type === 'hint') {
      const a = out.get(e.qid);
      if (a) a.maxHint = Math.max(a.maxHint, e.tier);
    }
  }
  return out;
}

const meanCredit = (qs: readonly QuestionAgg[]) => mean(qs.map((q) => q.bestCredit));
const shareOf = (qs: readonly QuestionAgg[], pred: (q: QuestionAgg) => boolean) => (qs.length === 0 ? null : qs.filter(pred).length / qs.length);
const needsHelp = (q: QuestionAgg) => q.maxHint >= 2 || q.revealed;

function mistakeLabel(id: MistakeId): string {
  return MISTAKES[id]?.label ?? id.replace(/_/g, ' ');
}

/** Pattern card statuses. recommended: a trigger mistake 2+ times in 14 days; using: an idiom flag in 3+ correct attempts; later: topic locked. */
export function patternStatuses(
  events: readonly AppEvent[], cards: readonly PatternCard[], unlockedTopics: readonly TopicId[], now: number,
): ReportData['patterns'] {
  const occ = mistakeOccurrences(events).filter((o) => o.ts >= now - WINDOW_14D);
  const recentCount = new Map<MistakeId, number>();
  for (const o of occ) recentCount.set(o.id, (recentCount.get(o.id) ?? 0) + 1);
  const correctFlagSets: Set<string>[] = [];
  for (const e of events) if (e.type === 'attempt' && e.correct && Array.isArray(e.flags)) correctFlagSets.push(new Set(e.flags));
  const unlocked = new Set(unlockedTopics);

  const recommended: ReportData['patterns'] = [];
  const using: ReportData['patterns'] = [];
  const later: ReportData['patterns'] = [];
  for (const card of cards) {
    const counts = card.triggers.map((t) => recentCount.get(t) ?? 0);
    const triggerCount = counts.reduce((s, n) => s + n, 0);
    const usingCount = card.idiomFlags.length === 0 ? 0 : correctFlagSets.filter((fs) => card.idiomFlags.some((f) => fs.has(f))).length;
    if (counts.some((n) => n >= 2)) recommended.push({ id: card.id, status: 'recommended', triggerCount });
    else if (usingCount >= 3) using.push({ id: card.id, status: 'using', triggerCount });
    else if (!unlocked.has(card.topicId)) later.push({ id: card.id, status: 'later', triggerCount });
  }
  recommended.sort((a, b) => b.triggerCount - a.triggerCount);
  return [...recommended, ...using, ...later];
}

const RUNG_TEXT: Record<Rung, string> = {
  read: 'reading and predicting code',
  repair: 'completing and fixing code',
  write: 'writing code',
};

export function buildReport(events: readonly AppEvent[], index: readonly QuestionMeta[], range: ReportRange, unlockedTopics: readonly TopicId[], now: number = Date.now()): ReportData {
  const all = sortedByTs(events);
  const inRange = filterRange(all, range, now);
  const metaById = new Map(index.map((q) => [q.qid, q]));
  const qAgg = aggregateQuestions(inRange, metaById);
  const qs = [...qAgg.values()];
  const attempts = inRange.filter((e): e is AttemptEvent => e.type === 'attempt');
  const attemptedQs = qs.filter((q) => q.attempts > 0);
  const unlocked = new Set(unlockedTopics);

  // ---- mistakes (occurrences from the whole log; counts limited to the range) ----
  const occAll = mistakeOccurrences(all);
  const rangeSessions = new Set(inRange.map((e) => e.sessionId));
  const inRangeOcc = (o: MistakeOccurrence) => {
    if (range === 'all') return true;
    if (range === 'session') return rangeSessions.has(o.sessionId);
    return o.ts >= now - (range === '7d' ? 7 : 30) * DAY;
  };
  const occRange = occAll.filter(inRangeOcc);
  const correctTsByQid = new Map<string, number[]>();
  for (const e of all) {
    if (e.type === 'attempt' && e.correct) {
      const l = correctTsByQid.get(e.qid);
      if (l) l.push(e.ts);
      else correctTsByQid.set(e.qid, [e.ts]);
    }
  }
  const statsAll = questionStats(all);
  const mistakeIds = [...new Set(occRange.map((o) => o.id))];
  const mistakes: ReportData['mistakes'] = mistakeIds.map((id) => {
    const mine = occRange.filter((o) => o.id === id);
    const everywhere = occAll.filter((o) => o.id === id);
    const fixes: number[] = [];
    for (const o of mine) {
      if (!o.qid) continue;
      const next = (correctTsByQid.get(o.qid) ?? []).find((ts) => ts > o.ts);
      if (next !== undefined) fixes.push(next - o.ts);
    }
    const detecting = index.filter((q) => q.detects.includes(id) && unlocked.has(q.topicId));
    const example = detecting.find((q) => !statsAll.get(q.qid)?.solved) ?? detecting[0];
    const lastQid = [...everywhere].reverse().find((o) => o.qid)?.qid ?? null;
    return {
      id,
      count: mine.length,
      questions: new Set(mine.map((o) => o.qid).filter(Boolean)).size,
      sessions: new Set(mine.map((o) => o.sessionId)).size,
      recent14d: everywhere.filter((o) => o.ts >= now - WINDOW_14D).length,
      lastTs: everywhere.reduce((m, o) => Math.max(m, o.ts), 0),
      medianFixMs: median(fixes),
      exampleQid: example?.qid ?? lastQid,
    };
  });
  mistakes.sort((a, b) => b.recent14d - a.recent14d || b.count - a.count || b.lastTs - a.lastTs);

  // ---- sessions (summaries over the whole log so "new" mistakes mean new ever) ----
  const summaries = sessionSummaries(all).filter((s) => rangeSessions.has(s.sessionId));
  const sessions: ReportData['sessions'] = summaries
    .filter((s) => s.questions > 0 || s.topics.length > 0)
    .map((s) => {
      const perQ = new Map<string, number>();
      for (const e of attempts) {
        if (e.sessionId !== s.sessionId) continue;
        const credit = e.revealed ? 0 : clamp01(Number(e.credit));
        perQ.set(e.qid, Math.max(perQ.get(e.qid) ?? 0, credit));
      }
      const duration = Math.round(s.focusedMin);
      return {
        sessionId: s.sessionId, start: s.start, end: s.end,
        durationMin: s.questions > 0 ? Math.max(1, duration) : duration,
        questions: s.questions,
        accuracy: mean([...perQ.values()]),
        newMistakes: s.newMistakes as MistakeId[],
        topics: s.topics,
      };
    })
    .sort((a, b) => b.start - a.start);
  const trend = sessions
    .filter((s) => s.accuracy !== null)
    .slice(0, 10)
    .map((s) => ({ sessionId: s.sessionId, start: s.start, accuracy: s.accuracy }))
    .reverse();

  // ---- totals ----
  const totals: ReportData['totals'] = {
    questions: qs.length,
    attempts: attempts.length,
    sessions: sessions.length,
    // Sum the per-session figures the sessions table shows (each rounded up to at least 1 minute when
    // questions were answered), so the headline can never read 0 minutes while a session row reads 1 min.
    focusedMinutes: sessions.reduce((sum, x) => sum + x.durationMin, 0),
    accuracy: meanCredit(qs),
    firstTryRate: shareOf(attemptedQs, (q) => q.firstCorrect === true),
    hintRate: shareOf(qs, (q) => q.maxHint >= 1),
    revealRate: shareOf(qs, (q) => q.revealed),
  };

  // ---- topics ----
  const totalsByTopic = new Map<string, number>();
  for (const q of index) totalsByTopic.set(q.topicId, (totalsByTopic.get(q.topicId) ?? 0) + 1);
  const recentOcc = occAll.filter((o) => o.ts >= now - WINDOW_14D);
  const topicTests = inRange.filter((e): e is Extract<AppEvent, { type: 'test_result' }> => e.type === 'test_result' && e.kind === 'topic-test');
  const weakShort = new Map<TopicId, string[]>();

  const topics: ReportData['topics'] = TOPICS.map((t) => {
    const tq = qs.filter((q) => q.topicId === t.id);
    const score = meanCredit(tq);
    const hintReliance = shareOf(tq, needsHelp);
    const byDiff: Record<Diff, { attempted: number; correct: number }> = {
      easy: { attempted: 0, correct: 0 }, medium: { attempted: 0, correct: 0 }, hard: { attempted: 0, correct: 0 },
    };
    for (const q of tq) {
      if (!q.diff || !byDiff[q.diff]) continue;
      byDiff[q.diff].attempted++;
      if (q.anyCorrect) byDiff[q.diff].correct++;
    }
    const lastTs = tq.length ? Math.max(...tq.map((q) => q.lastTs)) : null;

    const weak: string[] = [];
    const short: string[] = [];
    if (score !== null && tq.length >= MIN_FOR_WEAK_SCORE && score < 0.6) {
      weak.push(`Your score here is ${pct(score)} across ${plural(tq.length, 'question')}.`);
      short.push(`score ${pct(score)}`);
    }
    if (hintReliance !== null && tq.length >= MIN_FOR_WEAK_SCORE && hintReliance > 0.5) {
      const k = tq.filter(needsHelp).length;
      weak.push(`You needed the later hints or the answer on ${k} of ${plural(tq.length, 'question')}.`);
      short.push('needed a lot of help');
    }
    const repeatCounts = new Map<MistakeId, number>();
    for (const o of recentOcc) if (o.topicId === t.id) repeatCounts.set(o.id, (repeatCounts.get(o.id) ?? 0) + 1);
    const repeats = [...repeatCounts.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
    for (const [id, n] of repeats) weak.push(`The mistake "${mistakeLabel(id)}" came up ${n} times in the last 14 days.`);
    if (repeats.length) short.push(`"${mistakeLabel(repeats[0][0])}" keeps coming up`);
    const lastTest = [...topicTests].reverse().find((e) => e.topicIds.includes(t.id));
    if (lastTest && !lastTest.passed) {
      weak.push('You did not pass the last topic test.');
      short.push('topic test not passed yet');
    }

    let label: ReportData['topics'][number]['label'];
    let reasons: string[];
    if (weak.length > 0) {
      label = 'weak';
      reasons = weak;
      weakShort.set(t.id, short);
    } else if (tq.length === 0) {
      label = 'not-started';
      reasons = lastTest?.passed ? ['You passed the topic test.'] : [];
    } else if (score !== null && hintReliance !== null && tq.length >= MIN_FOR_STRONG && score >= 0.85 && hintReliance <= 0.3) {
      label = 'strong';
      reasons = [`You scored ${pct(score)} across ${plural(tq.length, 'question')}, mostly without hints.`];
    } else {
      label = 'ok';
      reasons = score !== null ? [`You scored ${pct(score)} across ${plural(tq.length, 'question')}.`] : [];
      if (tq.length < MIN_FOR_STRONG) reasons.push(`Try at least ${MIN_FOR_STRONG} questions here for a clearer picture.`);
    }
    return {
      topicId: t.id, attempted: tq.length, total: totalsByTopic.get(t.id) ?? 0, score, byDiff, hintReliance, lastTs, label, reasons,
    };
  });

  // ---- ladder ----
  const ladder: ReportData['ladder'] = TOPICS.map((t) => {
    const tq = qs.filter((q) => q.topicId === t.id && q.format);
    const rung = (r: Rung) => meanCredit(tq.filter((q) => q.format && FORMAT_LADDER[q.format] === r));
    return { topicId: t.id, read: rung('read'), repair: rung('repair'), write: rung('write') };
  });

  // ---- formats ----
  const formats: ReportData['formats'] = FORMATS.map((f) => {
    const fq = qs.filter((q) => q.format === f);
    const times = attempts.filter((e) => e.format === f).map((e) => Math.max(0, Number(e.timeMs) || 0));
    const med = median(times);
    return { format: f, attempted: fq.length, accuracy: meanCredit(fq), medianTimeSec: med === null ? null : Math.round(med / 1000) };
  });

  // ---- patterns ----
  const patterns = patternStatuses(all, PATTERNS, unlockedTopics, now);

  // ---- readiness ----
  const paperQs = qs.filter((q) => q.paper);
  const frac = (e: { score: number; total: number }) => clamp01(e.total > 0 ? e.score / e.total : e.score);
  const testsOfKind = (kind: 'practice-test' | 'mock-exam') =>
    inRange.filter((e): e is Extract<AppEvent, { type: 'test_result' }> => e.type === 'test_result' && e.kind === kind);
  const summarise = (kind: 'practice-test' | 'mock-exam') => {
    const fracs = testsOfKind(kind).map(frac);
    return {
      best: fracs.length ? Math.max(...fracs) : null,
      last: fracs.length ? fracs[fracs.length - 1] : null,
      attempts: fracs.length,
    };
  };
  const readiness: ReportData['readiness'] = {
    paperAccuracy: meanCredit(paperQs),
    practiceTest: summarise('practice-test'),
    mockExam: summarise('mock-exam'),
    recursionAccuracy: meanCredit(qs.filter((q) => q.topicId === 'recursion')),
    projectRules: projectRuleChecks(attempts, metaById),
  };

  // ---- behaviour ----
  let rushed = 0;
  let stuckNoHint = 0;
  for (const e of attempts) {
    if (e.correct || e.revealed) continue;
    const m = metaById.get(e.qid);
    if (!m || !(m.expectedSec > 0)) continue;
    const expectedMs = m.expectedSec * 1000;
    const t = Number(e.timeMs) || 0;
    if (t < 0.25 * expectedMs) rushed++;
    else if (t > 3 * expectedMs && e.hintTier === 0) stuckNoHint++;
  }
  const hintSkims = inRange.filter((e) => e.type === 'hint' && e.dwellMs < 2000).length;
  const lastExplainTs = new Map<string, number>();
  for (const e of all) if (e.type === 'self_explain') lastExplainTs.set(e.qid, Math.max(lastExplainTs.get(e.qid) ?? 0, e.ts));
  let revealedWithoutExplain = 0;
  for (const e of inRange) {
    if (e.type === 'reveal' && !((lastExplainTs.get(e.qid) ?? -1) >= e.ts)) revealedWithoutExplain++;
  }
  const behaviour = { rushed, stuckNoHint, hintSkims, revealedWithoutExplain };

  // ---- headline ----
  const strengths: string[] = [];
  for (const t of topics.filter((x) => x.label === 'strong').sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3)) {
    strengths.push(`${TOPIC_BY_ID[t.topicId].title}: ${pct(t.score ?? 0)} across ${plural(t.attempted, 'question')}.`);
  }
  if (strengths.length === 0) {
    const rungs: Rung[] = ['read', 'repair', 'write'];
    let best: { r: Rung; acc: number; n: number } | null = null;
    for (const r of rungs) {
      const rq = qs.filter((q) => q.format && FORMAT_LADDER[q.format] === r);
      const acc = meanCredit(rq);
      if (acc !== null && rq.length >= MIN_FOR_STRONG && acc >= 0.8 && (!best || acc > best.acc)) best = { r, acc, n: rq.length };
    }
    if (best) strengths.push(`You do well at ${RUNG_TEXT[best.r]}: ${pct(best.acc)} across ${plural(best.n, 'question')}.`);
  }

  const workOn: { text: string; href: string }[] = [];
  const pushWork = (text: string, href: string) => {
    if (workOn.length < 3 && !workOn.some((w) => w.href === href)) workOn.push({ text, href });
  };
  const weakTopics = topics.filter((x) => x.label === 'weak').sort((a, b) => (a.score ?? 1) - (b.score ?? 1));
  for (const t of weakTopics.slice(0, 2)) {
    pushWork(`Practise ${TOPIC_BY_ID[t.topicId].short}: ${joinAnd(weakShort.get(t.topicId) ?? [])}.`, `#/topic/${t.topicId}`);
  }
  const topMistake = mistakes.find((m) => m.recent14d >= 2 && m.exampleQid);
  if (topMistake?.exampleQid) {
    pushWork(`Work on "${mistakeLabel(topMistake.id)}": it came up ${topMistake.recent14d} times in the last 14 days.`, `#/q/${topMistake.exampleQid}`);
  }
  for (const row of ladder) {
    const t = topics.find((x) => x.topicId === row.topicId);
    if (row.read !== null && row.read >= 0.8 && row.write !== null && row.write < 0.5 && t && t.attempted >= 3) {
      pushWork(`${TOPIC_BY_ID[row.topicId].short}: you read code well (${pct(row.read)}) but writing lands at ${pct(row.write)}. Try a coding question there.`, `#/topic/${row.topicId}`);
    }
  }
  if (readiness.mockExam.last !== null && readiness.mockExam.last < 0.6) {
    pushWork(`Sit another mock final exam (last paper ${pct(readiness.mockExam.last)}).`, '#/exam');
  } else if (readiness.mockExam.attempts === 0 && totals.questions >= 10) {
    pushWork('Sit a mock final exam to see where you stand under exam conditions.', '#/exam');
  }
  if (workOn.length === 0) {
    const next = TOPICS.find((t) => unlocked.has(t.id) && topics.find((x) => x.topicId === t.id)?.label === 'not-started');
    if (next) pushWork(`Start ${next.title}.`, `#/topic/${next.id}`);
  }

  return {
    range,
    hasEnoughData: attempts.length >= 3,
    totals,
    headline: { strengths, workOn },
    topics,
    ladder,
    mistakes,
    formats,
    sessions,
    trend,
    patterns,
    readiness,
    behaviour,
  };
}

/** Project rules over the last 10 relevant write submissions: ok = rule kept, broken = its mistake was detected. */
function projectRuleChecks(attempts: readonly AttemptEvent[], metaById: ReadonlyMap<string, QuestionMeta>): ReportData['readiness']['projectRules'] {
  const relevantTo = (e: AttemptEvent, rules: readonly RuleId[]) => {
    if (e.format !== 'write') return false;
    const detects = metaById.get(e.qid)?.detects ?? [];
    const mistakes = e.mistakes ?? [];
    return rules.some((r) => detects.includes(RULE_MISTAKE[r]) || mistakes.includes(RULE_MISTAKE[r]));
  };
  const out: ReportData['readiness']['projectRules'] = [];
  const projectSubs = attempts.filter((e) => relevantTo(e, PROJECT_RULES)).slice(-10);
  if (projectSubs.length > 0) {
    for (const rule of PROJECT_RULES) {
      const broken = projectSubs.filter((e) => (e.mistakes ?? []).includes(RULE_MISTAKE[rule])).length;
      out.push({ rule, ok: projectSubs.length - broken, broken });
    }
  }
  const loopSubs = attempts.filter((e) => relevantTo(e, ['noLoops'])).slice(-10);
  if (loopSubs.length > 0) {
    const broken = loopSubs.filter((e) => (e.mistakes ?? []).includes('loop_in_recursion')).length;
    out.push({ rule: 'noLoops', ok: loopSubs.length - broken, broken });
  }
  return out;
}

/** Timeline of one session: question, result, hint tier, time. */
export function sessionTimeline(events: readonly AppEvent[], sessionId: string): { ts: number; qid: string; format: Format; correct: boolean; hintTier: number; revealed: boolean; timeMs: number }[] {
  return sortedByTs(events)
    .filter((e): e is AttemptEvent => e.type === 'attempt' && e.sessionId === sessionId)
    .map((e) => ({ ts: e.ts, qid: e.qid, format: e.format, correct: !!e.correct, hintTier: e.hintTier, revealed: !!e.revealed, timeMs: e.timeMs }));
}
