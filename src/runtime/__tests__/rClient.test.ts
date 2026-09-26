// The browser R client without a browser: a fake frame stands in for the sandbox iframe and answers the
// relay protocol from public/r-sandbox.js, so the queue, the start-up and the watchdog can be tested.
import { describe, expect, it } from 'vitest';
import { createRClient, R_LOAD_MESSAGE, R_TIMEOUT_MESSAGE } from '../rClient.ts';
import type { FrameLike } from '../rClient.ts';

type Msg = { plr: 1; id: number; op: string; text?: string; code?: string; base?: string };

/**
 * A pretend sandbox. `console` answers each line typed with the messages R would print; `evals` answers
 * evalString by the start of the code. `hang` makes a line never come back, like an endless loop.
 */
function fakeFrame(opts: { console?: Record<string, { type: string; data: string }[]>; hang?: string; failInit?: boolean } = {}) {
  const typed: string[] = [];
  let destroyed = false;
  let pendingOut: { type: string; data: string }[] = [{ type: 'stdout', data: 'R version banner' }, { type: 'prompt', data: '> ' }];
  let handler: FrameLike['onMessage'] = null;
  const frame: FrameLike = {
    // Like the real iframe, "loaded" can only arrive once someone is listening for it.
    get onMessage() { return handler; },
    set onMessage(h) {
      handler = h;
      if (h) queueMicrotask(() => h({ plr: 1, op: 'loaded' }));
    },
    destroy: () => { destroyed = true; },
    post: (raw) => {
      const m = raw as Msg;
      const reply = (ok: boolean, value: unknown) => queueMicrotask(() => frame.onMessage?.({ plr: 1, id: m.id, ok, value }));
      if (m.op === 'init') return opts.failInit ? reply(false, 'no network') : reply(true, null);
      if (m.op === 'write') {
        const line = (m.text ?? '').replace(/\n$/, '');
        typed.push(line);
        if (line === opts.hang) pendingOut = [];
        else pendingOut = opts.console?.[line] ?? [{ type: 'prompt', data: '> ' }];
        return reply(true, null);
      }
      if (m.op === 'drain') {
        if (pendingOut.length === 0) return; // never answers: R is still busy
        const out = pendingOut;
        pendingOut = [];
        return reply(true, out);
      }
      if (m.op === 'eval') {
        const code = m.code ?? '';
        if (code.includes('"ready"')) return reply(true, 'ready');
        if (code.startsWith('.pl_reset')) return reply(true, 'ok');
        if (code.startsWith('.pl_split')) {
          const src = JSON.parse(code.slice('.pl_split('.length, -1)) as string;
          const exprs = src.split('\n').filter(Boolean).map((line, i) => ({ src: line, line: i + 1 }));
          return reply(true, JSON.stringify({ ok: true, exprs }));
        }
        return reply(true, '');
      }
    },
  };
  return { frame, typed, isDestroyed: () => destroyed };
}

describe('R client', () => {
  it('starts R on first use and returns what it printed', async () => {
    const f = fakeFrame({ console: { 'sqrt(4)': [{ type: 'stdout', data: '[1] 2' }, { type: 'prompt', data: '> ' }] } });
    const r = createRClient({ createFrame: () => f.frame });
    expect(r.status.value.state).toBe('idle');
    const run = await r.run('sqrt(4)');
    expect(run).toEqual({ stdout: '[1] 2\n' });
    expect(r.status.value.state).toBe('ready');
    // The harness installs its error mark at the console before anything else is typed.
    expect(f.typed[0]).toContain('globalCallingHandlers');
  });

  it('runs one request at a time, in order', async () => {
    const f = fakeFrame({
      console: {
        a: [{ type: 'stdout', data: 'A' }, { type: 'prompt', data: '> ' }],
        b: [{ type: 'stdout', data: 'B' }, { type: 'prompt', data: '> ' }],
      },
    });
    const r = createRClient({ createFrame: () => f.frame });
    const [x, y] = await Promise.all([r.run('a'), r.run('b')]);
    expect([x.stdout, y.stdout]).toEqual(['A\n', 'B\n']);
    expect(f.typed.slice(1)).toEqual(['a', 'b']);
  });

  it('stops R when a run goes on too long, and starts a fresh one next time', async () => {
    const frames: ReturnType<typeof fakeFrame>[] = [];
    const r = createRClient({
      createFrame: () => { const f = fakeFrame({ hang: 'repeat {}' }); frames.push(f); return f.frame; },
      runTimeoutMs: 50,
    });
    const stuck = await r.run('repeat {}');
    expect(stuck.error?.message).toBe(R_TIMEOUT_MESSAGE);
    expect(frames[0].isDestroyed()).toBe(true);
    await r.run('1');
    expect(frames).toHaveLength(2);
  });

  it('says R could not load, without throwing, when the download fails', async () => {
    const f = fakeFrame({ failInit: true });
    const r = createRClient({ createFrame: () => f.frame });
    const run = await r.run('1');
    expect(run.error?.message).toBe(R_LOAD_MESSAGE);
    expect(r.status.value.state).toBe('error');
    expect(f.isDestroyed()).toBe(true);
  });

  it('fails every test of a task that could not run', async () => {
    const f = fakeFrame({ failInit: true });
    const r = createRClient({ createFrame: () => f.frame });
    const res = await r.task('x', 'function', [{ id: 't', label: 'one', hidden: false, call: 'f()', expect: '1' }]);
    expect(res.outcomes).toEqual([{ id: 't', label: 'one', hidden: false, pass: false, error: R_LOAD_MESSAGE }]);
  });
});
