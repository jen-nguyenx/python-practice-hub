// The R harness and console driver against real R (webR in Node): the same pair the verifier records
// lesson output with and the browser runs a student's code with. What is asserted here is how the
// harness behaves -- where a run stops, what gets reset, how values cross into JSON -- never a claim
// about statistics.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRSession } from '../../../scripts/verify/r.ts';
import type { RSession } from '../../../scripts/verify/r.ts';
import { ERROR_MARK } from '../r/driver.ts';

let s: RSession;
beforeAll(async () => {
  s = await createRSession();
});
afterAll(() => s?.close());

describe('runScript', () => {
  it('records autoprint, messages and warnings in the order R printed them', async () => {
    const r = await s.driver.runScript('x <- c(1, 4, 9)\nsqrt(x)\nmessage("note")\nlog(-1)\n');
    expect(r.error).toBeUndefined();
    const lines = r.stdout.trimEnd().split('\n');
    expect(lines[0]).toBe('[1] 1 2 3');
    expect(lines[1]).toBe('note');
    expect(lines).toContain('Warning message:');
    expect(r.stdout).not.toContain(ERROR_MARK);
  });

  it('stops at the first error, keeps what came before, and names the failing line', async () => {
    const r = await s.driver.runScript('1 + 1\nstop("boom")\nprint("never")\n');
    expect(r.stdout).toBe('[1] 2\n');
    expect(r.error).toEqual({ type: 'Error', message: 'Error: boom', line: 2 });
  });

  it("keeps R's own wording for an error raised inside a call", async () => {
    const r = await s.driver.runScript('log("a")\n');
    expect(r.error?.message.startsWith('Error in log("a")')).toBe(true);
  });

  it('reports a parse error without running anything', async () => {
    const r = await s.driver.runScript('print("ran")\nx y\n');
    expect(r.stdout).toBe('');
    expect(r.error?.type).toBe('SyntaxError');
    expect(r.error?.line).toBe(2);
    expect(r.error?.message.startsWith('Error: line 2')).toBe(true);
  });

  it('runs a multi-line expression as one', async () => {
    const r = await s.driver.runScript('f <- function(a) {\n  a * 2\n}\nf(21)\n');
    expect(r).toEqual({ stdout: '[1] 42\n' });
  });

  it('starts every run from an empty workspace, the starting options and the same random numbers', async () => {
    const first = await s.driver.runScript('leftover <- 1\noptions(digits = 3)\nrnorm(2)\n');
    const second = await s.driver.runScript('exists("leftover")\npi\nrnorm(2)\n');
    const lines = second.stdout.trimEnd().split('\n');
    expect(lines[0]).toBe('[1] FALSE');
    expect(lines[1]).toBe('[1] 3.141593');
    // The same seed both times, so the draws print the same (at the digits each run had).
    const again = await s.driver.runScript('rnorm(2)\n');
    expect(again.stdout).toBe(`${lines[2]}\n`);
    expect(first.error).toBeUndefined();
  });

  it('masks the functions that would wait for a person or stop R', async () => {
    for (const code of ['readline("name? ")\n', 'q()\n']) {
      const r = await s.driver.runScript(code);
      expect(r.error?.type).toBe('Error');
    }
    // And R is still there afterwards.
    expect((await s.driver.runScript('1\n')).stdout).toBe('[1] 1\n');
  });
});

describe('runShell', () => {
  it('keeps going after a failing line, the way a console does', async () => {
    const lines = await s.driver.runShell(['y <- 5', 'nope', 'y * 2']);
    expect(lines.map((l) => l.stdout)).toEqual(['', '', '[1] 10\n']);
    expect(lines[1].error?.message).toContain("object 'nope' not found");
  });

  it('refuses an incomplete line rather than leaving R waiting for the rest', async () => {
    const lines = await s.driver.runShell(['mean(c(1, 2)', '3 + 4']);
    expect(lines[0].error?.type).toBe('SyntaxError');
    expect(lines[1].stdout).toBe('[1] 7\n');
  });
});

describe('probe', () => {
  it('turns R values into JSON: numbers, arrays, pairs, objects and null', async () => {
    const r = await s.driver.probe('fit <- lm(dist ~ speed, data = cars)', {
      one: 'nrow(cars)',
      many: 'c(1.5, 2, 3)',
      pairs: 'cbind(c(1, 2), c(3, 4))',
      named: 'list(a = 1, b = "x")',
      missing: 'c(1, NA)',
      forced: 'as.list(7)',
      bad: 'nope + 1',
    });
    expect(r.values).toEqual({
      one: 50, many: [1.5, 2, 3], pairs: [[1, 3], [2, 4]], named: { a: 1, b: 'x' }, missing: [1, null], forced: [7],
    });
    expect(r.probeErrors?.bad).toContain("object 'nope' not found");
  });
});

describe('task', () => {
  const tests = [
    { id: 'a', label: 'a quarter', hidden: false, call: 'odds(0.2)', expect: '0.25', cmp: 'float' as const },
    { id: 'b', label: 'even', hidden: true, call: 'odds(0.5)', expect: '1' },
  ];

  it('passes a correct function, comparing numbers with tolerance', async () => {
    const r = await s.driver.task('odds <- function(p) p / (1 - p)\n', 'function', tests);
    expect(r.outcomes.map((o) => o.pass)).toEqual([true, true]);
  });

  it('shows what came back against what was wanted when a test fails', async () => {
    const r = await s.driver.task('odds <- function(p) p\n', 'function', tests);
    expect(r.outcomes[0]).toMatchObject({ pass: false, got: '[1] 0.2', want: '[1] 0.25' });
  });

  it('fails every test with R\'s error when the code itself stops', async () => {
    const r = await s.driver.task('odds <- function(p) p\nstop("broken")\n', 'function', tests);
    expect(r.run.error?.message).toBe('Error: broken');
    expect(r.outcomes.every((o) => !o.pass && o.error === 'Error: broken')).toBe(true);
  });

  it('judges a tiny expected number relatively, so 0 is not accepted for a p-value of 1e-7', async () => {
    const tiny = [{ id: 'p', label: 'a tiny p-value', hidden: false, call: 'p_value()', expect: '7.96e-07', cmp: 'float' as const }];
    expect((await s.driver.task('p_value <- function() 0\n', 'function', tiny)).outcomes[0].pass).toBe(false);
    expect((await s.driver.task('p_value <- function() 7.96e-07 * (1 + 1e-9)\n', 'function', tiny)).outcomes[0].pass).toBe(true);
    const zero = [{ id: 'z', label: 'zero', hidden: false, call: 'f()', expect: '0', cmp: 'float' as const }];
    expect((await s.driver.task('f <- function() 1e-15\n', 'function', zero)).outcomes[0].pass).toBe(true);
  });

  it('reports a call to a function that was never written', async () => {
    const r = await s.driver.task('# nothing yet\n', 'function', tests);
    expect(r.outcomes[0].error).toContain('could not find function "odds"');
  });
});

describe('packages', () => {
  it('installs a pinned package the first time code asks for it', async () => {
    const r = await s.driver.runScript('library(MASS)\nclass(glm.nb(breaks ~ tension, data = warpbreaks))[1]\n');
    expect(r).toEqual({ stdout: '[1] "negbin"\n' });
  });

  it('detaches it again before the next run, so a block cannot borrow an earlier library()', async () => {
    const r = await s.driver.runScript('glm.nb\n');
    expect(r.error?.message).toContain("object 'glm.nb' not found");
  });

  it('names the package a missing function comes from', async () => {
    expect(await s.driver.packageExporting('glm.nb')).toBe('MASS');
    expect(await s.driver.packageExporting('not_a_function_anywhere')).toBeNull();
  });

  it('leaves unknown packages to R, and says installing is not possible here', async () => {
    expect((await s.driver.runScript('library(dplyr)\n')).error?.message).toContain('there is no package called');
    expect((await s.driver.runScript('install.packages("dplyr")\n')).error?.message).toContain('cannot be installed here');
  });
});
