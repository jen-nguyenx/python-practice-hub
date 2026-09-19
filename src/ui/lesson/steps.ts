// The shape of a lesson: one ordered path through a topic's teaching material.
//
// A topic page offers cheat sheet, worked example, experiments and mistakes as tabs, which leaves the
// student to work out what to read first. A lesson answers that for them: read the idea, watch it work,
// change it and see what happens, learn the traps, then practise. Nothing here is new content — this is
// the order, and the order is the teaching.
import type { Experiment, Topic } from '../../content/schema.ts';

export type LessonStep =
  | { kind: 'intro'; label: string }
  | { kind: 'idea'; label: string }
  | { kind: 'example'; label: string }
  | { kind: 'experiment'; label: string; experiment: Experiment }
  | { kind: 'mistakes'; label: string }
  | { kind: 'practise'; label: string };

/** Steps with nothing to show are left out, so a half-written topic still gives a sensible lesson. */
export function lessonSteps(topic: Topic | null | undefined): LessonStep[] {
  const steps: LessonStep[] = [{ kind: 'intro', label: 'Start here' }];
  if (topic?.cheatsheet?.trim()) steps.push({ kind: 'idea', label: 'The idea' });

  const ex = topic?.workedExample;
  if (ex && (ex.code?.trim() || (ex.steps?.length ?? 0) > 0)) steps.push({ kind: 'example', label: 'Watch it work' });

  const experiments = topic?.experiments ?? [];
  experiments.forEach((experiment, i) => {
    steps.push({ kind: 'experiment', experiment, label: experiments.length > 1 ? `Try it ${i + 1}` : 'Try it' });
  });

  if ((topic?.commonMistakes?.length ?? 0) > 0) steps.push({ kind: 'mistakes', label: 'Traps' });
  steps.push({ kind: 'practise', label: 'Your turn' });
  return steps;
}

/** Keep a remembered position usable after the content behind it changed. */
export function clampStep(index: number, total: number): number {
  if (!Number.isFinite(index) || total <= 0) return 0;
  return Math.min(Math.max(Math.floor(index), 0), total - 1);
}

const key = (topicId: string) => `pyladder:lesson:${topicId}`;

export function loadStep(topicId: string): number {
  try {
    const raw = localStorage.getItem(key(topicId));
    const n = raw === null ? 0 : Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function saveStep(topicId: string, index: number): void {
  try { localStorage.setItem(key(topicId), String(Math.max(0, Math.floor(index)))); } catch { /* storage blocked */ }
}
