// Topic page filter and tab state, remembered per topic for this browser tab (sessionStorage).
import type { Diff, Format, Ladder } from '../../../content/ids.ts';

export type TopicTab = 'questions' | 'cheatsheet' | 'example' | 'mistakes';
export const TOPIC_TABS: readonly TopicTab[] = ['questions', 'cheatsheet', 'example', 'mistakes'];

export interface TopicFilters {
  diff: 'all' | Diff;
  skills: Ladder[];
  formats: Format[];
  unsolvedOnly: boolean;
  weakFirst: boolean;
}

export const DEFAULT_FILTERS: TopicFilters = { diff: 'all', skills: [], formats: [], unsolvedOnly: false, weakFirst: false };

const fKey = (id: string) => `pyladder:topic-filters:${id}`;
const tKey = (id: string) => `pyladder:topic-tab:${id}`;

export function loadFilters(topicId: string): TopicFilters {
  try {
    const raw = sessionStorage.getItem(fKey(topicId));
    if (!raw) return DEFAULT_FILTERS;
    const v = JSON.parse(raw) as Partial<TopicFilters>;
    return {
      diff: v.diff === 'easy' || v.diff === 'medium' || v.diff === 'hard' ? v.diff : 'all',
      skills: Array.isArray(v.skills) ? v.skills.filter((s): s is Ladder => s === 'read' || s === 'repair' || s === 'write') : [],
      formats: Array.isArray(v.formats) ? v.formats.filter((f): f is Format => typeof f === 'string') : [],
      unsolvedOnly: v.unsolvedOnly === true,
      weakFirst: v.weakFirst === true,
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function saveFilters(topicId: string, f: TopicFilters) {
  try { sessionStorage.setItem(fKey(topicId), JSON.stringify(f)); } catch { /* storage blocked */ }
}

export function loadTopicTab(topicId: string): TopicTab {
  try {
    const v = sessionStorage.getItem(tKey(topicId));
    return v && (TOPIC_TABS as readonly string[]).includes(v) ? (v as TopicTab) : 'questions';
  } catch {
    return 'questions';
  }
}

export function rememberTopicTab(topicId: string, tab: TopicTab) {
  try { sessionStorage.setItem(tKey(topicId), tab); } catch { /* storage blocked */ }
}

export function isFiltered(f: TopicFilters) {
  return f.diff !== 'all' || f.skills.length > 0 || f.formats.length > 0 || f.unsolvedOnly;
}
