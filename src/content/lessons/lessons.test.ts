import { describe, expect, it } from 'vitest';
import { TOPIC_BY_ID } from '../topics.ts';
import { blockKey, TRACK_BLURB, TRACK_LABEL, TRACKS } from '../lessonSchema.ts';
import { LESSON_BY_ID, LESSON_FOR_TOPIC, LESSON_INDEX, lessonsInTrack } from './index.ts';

describe('tracks', () => {
  it('every track has a label and a blurb', () => {
    for (const t of TRACKS) {
      expect(TRACK_LABEL[t], `label for ${t}`).toBeTruthy();
      expect(TRACK_BLURB[t], `blurb for ${t}`).toBeTruthy();
    }
    expect(Object.keys(TRACK_LABEL).sort()).toEqual([...TRACKS].sort());
  });
});

describe('blockKey', () => {
  it('is unique per section and block, and stable', () => {
    expect(blockKey(0, 0)).toBe('s0-b0');
    expect(blockKey(2, 11)).toBe('s2-b11');
    const keys = new Set<string>();
    for (let s = 0; s < 12; s++) for (let b = 0; b < 40; b++) keys.add(blockKey(s, b));
    expect(keys.size).toBe(12 * 40);
  });
});

describe('the generated lesson index', () => {
  it('has a unique, kebab-case id for every lesson', () => {
    const ids = LESSON_INDEX.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('gives every lesson a real track, a title, a summary and sections', () => {
    for (const l of LESSON_INDEX) {
      expect(TRACKS, `${l.id} track`).toContain(l.track);
      expect(l.title, `${l.id} title`).toBeTruthy();
      expect(l.summary, `${l.id} summary`).toBeTruthy();
      expect(l.sections, `${l.id} sections`).toBeGreaterThan(1);
      expect(l.minutes, `${l.id} minutes`).toBeGreaterThan(1);
      expect(l.outcomes.length, `${l.id} outcomes`).toBeGreaterThan(1);
    }
  });

  it('only points at topics that exist, and at most one lesson per topic', () => {
    const claimed = new Map<string, string>();
    for (const l of LESSON_INDEX) {
      if (!l.topicId) continue;
      expect(TOPIC_BY_ID[l.topicId], `${l.id} topicId`).toBeTruthy();
      expect(claimed.has(l.topicId), `${l.topicId} claimed twice`).toBe(false);
      claimed.set(l.topicId, l.id);
    }
  });

  it('only names prerequisites that are themselves lessons', () => {
    for (const l of LESSON_INDEX) {
      for (const p of l.prereqs ?? []) {
        expect(LESSON_BY_ID[p], `${l.id} prereq ${p}`).toBeTruthy();
        expect(p, `${l.id} requires itself`).not.toBe(l.id);
      }
    }
  });

  it('indexes by id and by topic consistently', () => {
    for (const l of LESSON_INDEX) {
      expect(LESSON_BY_ID[l.id]).toBe(l);
      if (l.topicId) expect(LESSON_FOR_TOPIC[l.topicId]).toBe(l);
    }
    expect(Object.keys(LESSON_BY_ID).length).toBe(LESSON_INDEX.length);
  });

  it('splits cleanly across the tracks with nothing lost', () => {
    const total = TRACKS.reduce((n, t) => n + lessonsInTrack(t).length, 0);
    expect(total).toBe(LESSON_INDEX.length);
  });
});
