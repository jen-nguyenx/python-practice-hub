import { describe, expect, it } from 'vitest';
import { sanitizeEvent } from '../../store/validate.ts';
import type { Experiment, Topic } from '../../content/schema.ts';
import { clampStep, lessonSteps } from './steps.ts';

const experiment = (id: string): Experiment => ({
  id, title: `Experiment ${id}`, intro: 'i', takeaway: 't',
  template: 'print(⟦a⟧)\n',
  knobs: [{ id: 'a', label: 'a', choices: [{ value: '1' }, { value: '2' }] }],
});

const full = {
  id: 'strings',
  cheatsheet: '**Slicing**\n\nword[a:b]',
  workedExample: { title: 'w', code: 'print(1)', steps: ['one'] },
  commonMistakes: [{ mistake: 'off_by_one', bad: 'a', good: 'b', note: 'n' }],
  scenarios: [],
  experiments: [experiment('t05-x1'), experiment('t05-x2')],
} as unknown as Topic;

describe('lessonSteps', () => {
  it('runs intro, idea, example, each experiment, traps, then practise', () => {
    expect(lessonSteps(full).map((s) => s.kind)).toEqual([
      'intro', 'idea', 'example', 'experiment', 'experiment', 'mistakes', 'practise',
    ]);
  });

  it('numbers the experiment steps only when there is more than one', () => {
    expect(lessonSteps(full).filter((s) => s.kind === 'experiment').map((s) => s.label)).toEqual(['Try it 1', 'Try it 2']);
    const one = { ...full, experiments: [experiment('t05-x1')] } as Topic;
    expect(lessonSteps(one).filter((s) => s.kind === 'experiment').map((s) => s.label)).toEqual(['Try it']);
  });

  it('carries the experiment itself, so the step can render it', () => {
    const step = lessonSteps(full).find((s) => s.kind === 'experiment');
    expect(step?.kind === 'experiment' && step.experiment.id).toBe('t05-x1');
  });

  it('leaves out steps that have nothing to show', () => {
    const bare = { id: 'strings', cheatsheet: '', workedExample: { title: '', code: '', steps: [] }, commonMistakes: [], scenarios: [] } as unknown as Topic;
    expect(lessonSteps(bare).map((s) => s.kind)).toEqual(['intro', 'practise']);
  });

  it('keeps the worked example when it has steps but no code, and vice versa', () => {
    const stepsOnly = { ...full, workedExample: { title: 'w', code: '', steps: ['one'] } } as Topic;
    const codeOnly = { ...full, workedExample: { title: 'w', code: 'print(1)', steps: [] } } as Topic;
    expect(lessonSteps(stepsOnly).some((s) => s.kind === 'example')).toBe(true);
    expect(lessonSteps(codeOnly).some((s) => s.kind === 'example')).toBe(true);
  });

  it('still gives a usable lesson while the topic is loading', () => {
    expect(lessonSteps(null).map((s) => s.kind)).toEqual(['intro', 'practise']);
  });
});

describe('clampStep', () => {
  it('keeps a remembered position inside the steps that exist now', () => {
    expect(clampStep(9, 4)).toBe(3);
    expect(clampStep(-3, 4)).toBe(0);
    expect(clampStep(2, 4)).toBe(2);
  });

  it('survives rubbish rather than rendering an undefined step', () => {
    expect(clampStep(NaN, 4)).toBe(0);
    expect(clampStep(1, 0)).toBe(0);
    expect(clampStep(1.7, 4)).toBe(1);
  });
});

describe('the lesson_done event', () => {
  const base = { eid: 'e1', v: 1, ts: 1700000000000, sessionId: 's1' };

  it('is kept when it names a real topic', () => {
    expect(sanitizeEvent({ ...base, type: 'lesson_done', topicId: 'strings' }))
      .toEqual({ ...base, type: 'lesson_done', topicId: 'strings' });
  });

  it('is dropped when the topic is unknown or missing', () => {
    expect(sanitizeEvent({ ...base, type: 'lesson_done', topicId: 'not-a-topic' })).toBeNull();
    expect(sanitizeEvent({ ...base, type: 'lesson_done' })).toBeNull();
  });
});
