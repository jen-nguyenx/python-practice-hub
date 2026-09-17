// Narrow an event log and a report to one topic (for #/report/:topicId). Pure; unit-tested.
import type { TopicId } from '../../content/ids.ts';
import { topicIdOfQuestion } from '../../content/index.ts';
import { PATTERNS } from '../../content/patterns.ts';
import type { ReportData } from '../../engine/report.ts';
import type { AppEvent } from '../../engine/types.ts';

function eventTopic(e: AppEvent, qidTopic: (qid: string) => TopicId | undefined): TopicId | null | 'many' {
  switch (e.type) {
    case 'topic_open':
    case 'attempt':
    case 'hint':
    case 'reveal':
      return e.topicId;
    case 'mistake':
    case 'run':
      return e.topicId ?? (e.qid ? qidTopic(e.qid) ?? null : null);
    case 'self_explain':
    case 'flag':
      return qidTopic(e.qid) ?? null;
    case 'test_result':
      return 'many';
    default:
      return null;
  }
}

/**
 * Events that belong to one topic, plus the session_start of every session that touched it,
 * so session and time figures cover only work on that topic.
 */
export function eventsForTopic(events: readonly AppEvent[], topicId: TopicId, qidTopic: (qid: string) => TopicId | undefined = topicIdOfQuestion): AppEvent[] {
  const keep = new Set<string>();
  const sessions = new Set<string>();
  for (const e of events) {
    const t = eventTopic(e, qidTopic);
    const mine = t === topicId || (t === 'many' && e.type === 'test_result' && e.topicIds.includes(topicId));
    if (mine) {
      keep.add(e.eid);
      sessions.add(e.sessionId);
    }
  }
  return events.filter((e) => keep.has(e.eid) || (e.type === 'session_start' && sessions.has(e.sessionId)));
}

/** Rows of a report that are about other topics are dropped; patterns that are "later" for other topics are hidden. */
export function narrowReport(data: ReportData, topicId: TopicId): ReportData {
  const cardTopic = new Map(PATTERNS.map((p) => [p.id, p.topicId]));
  return {
    ...data,
    topics: data.topics.filter((t) => t.topicId === topicId),
    ladder: data.ladder.filter((l) => l.topicId === topicId),
    sessions: data.sessions.filter((s) => s.topics.length === 0 || s.topics.includes(topicId)),
    patterns: data.patterns.filter((p) => p.status !== 'later' || cardTopic.get(p.id) === topicId),
  };
}
