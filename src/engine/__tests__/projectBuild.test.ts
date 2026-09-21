import { describe, expect, it } from 'vitest';
import type { Question, Scenario } from '../../content/schema.ts';
import { buildProgress, projectBuild, solvedIds } from '../projectBuild.ts';
import type { AppEvent } from '../types.ts';

const TOPIC = 'project-simulator' as const;

function q(id: string, format: string, kind?: string, over: Record<string, unknown> = {}): Question {
  return { id, format, title: `Question ${id}`, diff: 'medium', core: true, prompt: 'p', hints: [], concepts: [], ...(kind ? { kind } : {}), ...over } as unknown as Question;
}

function scenario(questions: Question[]): Scenario {
  return { id: 't12-s1', title: 'Swan River salinity report', story: 'A story.', questions };
}

describe('projectBuild', () => {
  it('is not a build without a main() to assemble', () => {
    expect(projectBuild(scenario([q('a', 'mcq'), q('b', 'write', 'function')]), TOPIC)).toBeNull();
  });

  it('puts the helpers before the assembly, and a brief and a plan before both', () => {
    const b = projectBuild(scenario([
      q('r1', 'mcq'),
      q('h1', 'write', 'function'),
      q('m1', 'write', 'project'),
    ]), TOPIC)!;
    expect(b.stages.map((s) => s.kind)).toEqual(['brief', 'plan', 'piece', 'assemble', 'check']);
    expect(b.stages.find((s) => s.kind === 'piece')?.qid).toBe('h1');
    expect(b.stages.find((s) => s.kind === 'assemble')?.qid).toBe('m1');
  });

  it('leaves out the questions that are not code to write', () => {
    const b = projectBuild(scenario([
      q('r1', 'predict'), q('r2', 'fixBug'), q('m1', 'write', 'project'),
    ]), TOPIC)!;
    expect(b.stages.filter((s) => s.qid).map((s) => s.qid)).toEqual(['m1']);
  });

  it('handles a scenario with two main() tasks and no helper', () => {
    const b = projectBuild(scenario([q('m1', 'write', 'project'), q('m2', 'write', 'project')]), TOPIC)!;
    const assembles = b.stages.filter((s) => s.kind === 'assemble');
    expect(assembles).toHaveLength(2);
    expect(assembles.map((s) => s.label)).toEqual(['Assemble 1', 'Assemble 2']);
    // With nothing to decompose into, the plan stage still earns its place.
    expect(b.stages[1].blurb).toMatch(/read, clean, calculate/);
  });

  it('collects the rules the project declares, without repeating them', () => {
    const b = projectBuild(scenario([
      q('m1', 'write', 'project', { rules: ['noImport', 'noPrint'] }),
      q('m2', 'write', 'project', { rules: ['noPrint', 'mainSignature'] }),
    ]), TOPIC)!;
    expect(b.rules).toEqual(['noImport', 'noPrint', 'mainSignature']);
  });
});

describe('progress', () => {
  const build = projectBuild(scenario([
    q('h1', 'write', 'function'), q('h2', 'write', 'function'), q('m1', 'write', 'project'),
  ]), TOPIC)!;

  it('counts only the stages that ask for code', () => {
    const p = buildProgress(build, new Set(['h1']));
    expect(p).toMatchObject({ done: 1, total: 3 });
    expect(build.stages[p.nextIndex].qid).toBe('h2');
  });

  it('lands on the last stage once everything is written', () => {
    const p = buildProgress(build, new Set(['h1', 'h2', 'm1']));
    expect(p.done).toBe(3);
    expect(build.stages[p.nextIndex].kind).toBe('check');
  });
});

describe('solvedIds', () => {
  const base = { v: 1 as const, sessionId: 's', topicId: TOPIC };
  const attempt = (qid: string, correct: boolean, ts: number): AppEvent =>
    ({ ...base, eid: `a${ts}`, ts, type: 'attempt', qid, format: 'write', diff: 'medium', mode: 'practice',
      checkNo: 1, correct, score: correct ? 1 : 0, credit: correct ? 1 : 0, hintTier: 0, revealed: false,
      timeMs: 1, mistakes: [] }) as AppEvent;

  it('counts a clean solve', () => {
    expect(solvedIds([attempt('h1', false, 1), attempt('h1', true, 2)])).toContain('h1');
  });

  it('does not count a question whose answer was shown', () => {
    const reveal = { ...base, eid: 'r', ts: 1, type: 'reveal', qid: 'h1' } as AppEvent;
    expect(solvedIds([reveal, attempt('h1', true, 2)]).has('h1')).toBe(false);
  });
});
