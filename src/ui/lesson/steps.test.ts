import { describe, expect, it } from 'vitest';
import { sanitizeEvent } from '../../store/validate.ts';
import { clampStep } from './steps.ts';

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

  it('keeps the lesson id, with the topic when the lesson teaches one', () => {
    expect(sanitizeEvent({ ...base, type: 'lesson_done', lessonId: 'core-strings', topicId: 'strings' }))
      .toEqual({ ...base, type: 'lesson_done', lessonId: 'core-strings', topicId: 'strings' });
  });

  it('keeps a lesson that teaches no topic, which is two tracks out of three', () => {
    expect(sanitizeEvent({ ...base, type: 'lesson_done', lessonId: 'comprehensions' }))
      .toEqual({ ...base, type: 'lesson_done', lessonId: 'comprehensions' });
  });

  it('drops an unknown topic rather than storing it', () => {
    expect(sanitizeEvent({ ...base, type: 'lesson_done', lessonId: 'x', topicId: 'not-a-topic' }))
      .toEqual({ ...base, type: 'lesson_done', lessonId: 'x' });
  });

  it('rebuilds an id for an older event that carried only a topic', () => {
    expect(sanitizeEvent({ ...base, type: 'lesson_done', topicId: 'strings' }))
      .toEqual({ ...base, type: 'lesson_done', lessonId: 'topic:strings', topicId: 'strings' });
  });

  it('is dropped when it names neither a lesson nor a topic', () => {
    expect(sanitizeEvent({ ...base, type: 'lesson_done' })).toBeNull();
  });
});
