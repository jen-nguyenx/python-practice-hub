// Playground (#/playground): free coding space with scratch files, Run with input, Output, Problems and Explain.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AstFinding, PyError } from '../../runtime/protocol.ts';
import type { ScratchFile } from '../../store/types.ts';
import { py, store } from '../../app/services.ts';
import { Button } from '../components/Button.tsx';
import { Callout } from '../components/Callout.tsx';
import { Icon } from '../components/Icon.tsx';
import { CodeEditor } from '../editor/CodeEditor.tsx';
import { useConfirm } from '../workbench/Dialog.tsx';
import { ExplainError } from '../workbench/ExplainError.tsx';
import { takePendingPlaygroundFile } from '../workbench/openInPlayground.ts';
import { backupScratch, takeScratchBackup } from '../workbench/unsaved.ts';
import { stdinLines } from '../formats/code/logic.ts';
import { PanelTabs } from '../workbench/PanelTabs.tsx';
import { markersFrom, runtimeStatusText, warningFlags } from '../workbench/plain.ts';
import { ProblemsList } from '../workbench/ProblemsList.tsx';
import { useProgramRunner } from '../workbench/runner.ts';
import { kbdRun, useRunShortcuts } from '../workbench/shortcuts.ts';
import { Terminal } from '../workbench/Terminal.tsx';
import '../workbench/playground.css';

export const HELLO_CODE = `# Welcome to the Playground. Press Run (Ctrl+Enter) to try this.
name = input("What is your name? ")
print(f"Hello, {name}!")

total = 0
for n in range(1, 6):
    total += n
print("1 + 2 + 3 + 4 + 5 =", total)
`;

const ACTIVE_KEY = 'pyladder:playground-active';
const EMPTY: AstFinding[] = [];

function newId() {
  try {
    return `s-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  } catch {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function uniqueName(base: string, files: ScratchFile[]) {
  const clean = base.trim().replace(/[\\/]/g, '-') || 'untitled.py';
  const withExt = /\.py$/i.test(clean) ? clean : `${clean}.py`;
  const taken = new Set(files.map((f) => f.name.toLowerCase()));
  if (!taken.has(withExt.toLowerCase())) return withExt;
  const stem = withExt.replace(/\.py$/i, '');
  for (let i = 2; ; i++) {
    const n = `${stem}-${i}.py`;
    if (!taken.has(n.toLowerCase())) return n;
  }
}

function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}
function writeActive(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function Playground() {
  const [files, setFiles] = useState<ScratchFile[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string; error?: string } | null>(null);
  const [tab, setTab] = useState('output');
  const [analysis, setAnalysis] = useState<{ syntaxError?: PyError; flags: AstFinding[] } | null>(null);
  const [confirmEl, confirm] = useConfirm();
  const runner = useProgramRunner({ qid: null, topicId: null });
  const status = py.status.value;
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latest = useRef<ScratchFile[]>([]);

  useEffect(() => {
    py.warmUp();
    let alive = true;
    (async () => {
      try {
        await store.ready;
        let list = (await store.listScratch()).slice().sort((a, b) => a.id.localeCompare(b.id));
        const created: ScratchFile[] = [];
        // Edits that were still waiting to be saved when the tab last closed.
        for (const b of takeScratchBackup<ScratchFile>()) {
          const i = list.findIndex((f) => f.id === b.id);
          if (i >= 0 && b.updatedAt > list[i].updatedAt) {
            list = list.map((f) => (f.id === b.id ? b : f));
            created.push(b);
          } else if (i < 0) {
            list = [...list, b];
            created.push(b);
          }
        }
        if (!list.length) {
          created.push({ id: newId(), name: 'hello.py', code: HELLO_CODE, stdin: '', updatedAt: Date.now() });
          list = [...created];
        }
        const pending = takePendingPlaygroundFile();
        let focusId = readActive();
        if (pending) {
          const f: ScratchFile = { id: newId(), name: uniqueName(pending.name ?? 'snippet.py', list), code: pending.code, stdin: '', updatedAt: Date.now() };
          created.push(f);
          list = [...list, f];
          focusId = f.id;
        }
        for (const f of created) await store.saveScratch(f).catch(() => undefined);
        if (!alive) return;
        latest.current = list;
        setFiles(list);
        setActiveId(list.some((f) => f.id === focusId) ? focusId : list[0].id);
      } catch (err) {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : String(err));
        const fallback: ScratchFile = { id: newId(), name: 'hello.py', code: HELLO_CODE, stdin: '', updatedAt: Date.now() };
        latest.current = [fallback];
        setFiles([fallback]);
        setActiveId(fallback.id);
      }
    })();
    // Flush pending saves when leaving the page or closing the tab.
    const onHide = () => {
      backupScratch(latest.current.filter((f) => saveTimers.current.has(f.id)));
      flush();
    };
    const flush = () => {
      for (const [id, t] of saveTimers.current) {
        clearTimeout(t);
        const f = latest.current.find((x) => x.id === id);
        if (f) store.saveScratch(f).catch(() => undefined);
      }
      saveTimers.current.clear();
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      alive = false;
      window.removeEventListener('pagehide', onHide);
      flush();
    };
  }, []);

  const active = files?.find((f) => f.id === activeId) ?? null;

  const update = (id: string, patch: Partial<ScratchFile>) => {
    setFiles((prev) => {
      if (!prev) return prev;
      const next = prev.map((f) => (f.id === id ? { ...f, ...patch, updatedAt: Date.now() } : f));
      latest.current = next;
      return next;
    });
    const timers = saveTimers.current;
    const old = timers.get(id);
    if (old) clearTimeout(old);
    timers.set(id, setTimeout(() => {
      timers.delete(id);
      const f = latest.current.find((x) => x.id === id);
      if (f) store.saveScratch(f).catch((err) => console.warn('Could not save scratch file', err));
    }, 500));
  };

  const select = (id: string) => {
    setActiveId(id);
    writeActive(id);
    setAnalysis(null);
    runner.clear();
  };

  const newFile = () => {
    if (!files) return;
    const f: ScratchFile = { id: newId(), name: uniqueName('untitled.py', files), code: '', stdin: '', updatedAt: Date.now() };
    const next = [...files, f];
    latest.current = next;
    setFiles(next);
    store.saveScratch(f).catch(() => undefined);
    select(f.id);
    setRenaming({ id: f.id, value: f.name });
  };

  const commitRename = () => {
    if (!renaming || !files) return;
    const raw = renaming.value.trim();
    if (!raw) {
      setRenaming({ ...renaming, error: 'Type a file name.' });
      return;
    }
    const name = /\.py$/i.test(raw) ? raw : `${raw}.py`;
    if (/[\\/]/.test(name)) {
      setRenaming({ ...renaming, error: 'File names cannot contain / or \\.' });
      return;
    }
    if (files.some((f) => f.id !== renaming.id && f.name.toLowerCase() === name.toLowerCase())) {
      setRenaming({ ...renaming, error: 'Another file already has that name.' });
      return;
    }
    update(renaming.id, { name });
    setRenaming(null);
  };

  const remove = async (f: ScratchFile) => {
    if (!files) return;
    const ok = await confirm({ title: `Delete ${f.name}?`, body: 'This removes the file from this browser. It cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const t = saveTimers.current.get(f.id);
    if (t) clearTimeout(t);
    saveTimers.current.delete(f.id);
    await store.deleteScratch(f.id).catch(() => undefined);
    let next = files.filter((x) => x.id !== f.id);
    if (!next.length) {
      const blank: ScratchFile = { id: newId(), name: 'untitled.py', code: '', stdin: '', updatedAt: Date.now() };
      next = [blank];
      store.saveScratch(blank).catch(() => undefined);
    }
    latest.current = next;
    setFiles(next);
    if (activeId === f.id) select(next[Math.max(0, files.findIndex((x) => x.id === f.id) - 1)]?.id ?? next[0].id);
  };

  // Problems: parse-only analysis, debounced.
  const token = useRef(0);
  const code = active?.code ?? '';
  useEffect(() => {
    if (!active) return;
    const my = ++token.current;
    const t = setTimeout(() => {
      py.analyze(code).then((a) => { if (my === token.current) setAnalysis(a); }).catch(() => undefined);
    }, 600);
    return () => clearTimeout(t);
  }, [code, activeId]);

  const run = () => {
    if (!active || runner.state.running) return;
    setTab('output');
    void runner.run(active.code, stdinLines(active.stdin));
  };
  useRunShortcuts({ onRun: run });

  const runErr = runner.state.result?.error ?? null;
  const syntaxError = analysis?.syntaxError ?? (runErr?.type === 'SyntaxError' || runErr?.type === 'IndentationError' ? runErr : null);
  const flags = analysis?.flags ?? EMPTY;
  const markers = useMemo(() => markersFrom({ syntaxError, runtimeError: runErr && runErr !== syntaxError ? runErr : null, flags }), [syntaxError, runErr, flags]);
  const problemCount = (syntaxError ? 1 : 0) + warningFlags(flags).length;

  if (!files || !active) {
    return (
      <div class="pg">
        <div class="pg-head"><h1 class="pg-title">Playground</h1></div>
        <div class="pg-loading muted">Opening your files…</div>
      </div>
    );
  }

  return (
    <div class="pg">
      {confirmEl}
      <div class="pg-head">
        <h1 class="pg-title">Playground</h1>
        <p class="muted pg-sub">Try anything. Files are saved in this browser.</p>
        <span class="spacer" />
        <span class={`pg-status ${status.state}`} aria-live="polite"><span class="sb-dot" aria-hidden="true" />{runtimeStatusText(status)}</span>
      </div>
      {loadError ? <Callout tone="bad" title="Your saved files could not be opened">{loadError} Changes may not be saved.</Callout> : null}
      <div class="pg-files">
      <div class="pg-tablist" role="tablist" aria-label="Scratch files">
        {files.map((f) => {
          const selected = f.id === active.id;
          if (renaming?.id === f.id) {
            return (
              <form key={f.id} class="pg-rename" onSubmit={(e) => { e.preventDefault(); commitRename(); }}>
                <label class="sr-only" for="pg-rename-input">New name for {f.name}</label>
                <input
                  id="pg-rename-input"
                  value={renaming.value}
                  autoFocus
                  spellcheck={false}
                  autocomplete="off"
                  aria-invalid={renaming.error ? true : undefined}
                  aria-describedby={renaming.error ? 'pg-rename-error' : undefined}
                  onInput={(e) => setRenaming({ id: f.id, value: e.currentTarget.value })}
                  onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setRenaming(null); } }}
                  onBlur={commitRename}
                />
                {renaming.error ? <span id="pg-rename-error" class="pg-rename-error" role="alert">{renaming.error}</span> : null}
              </form>
            );
          }
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              class={`pg-file${selected ? ' active' : ''}`}
              onClick={() => select(f.id)}
              onDblClick={() => setRenaming({ id: f.id, value: f.name })}
              onKeyDown={(e) => {
                const i = files.findIndex((x) => x.id === f.id);
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const n = files[(i + (e.key === 'ArrowRight' ? 1 : -1) + files.length) % files.length];
                  select(n.id);
                  requestAnimationFrame(() => (document.querySelector('.pg-file.active') as HTMLElement | null)?.focus());
                } else if (e.key === 'F2') {
                  e.preventDefault();
                  setRenaming({ id: f.id, value: f.name });
                }
              }}
            >
              <Icon name="file" size={13} /> {f.name}
            </button>
          );
        })}
      </div>
        <Button size="sm" variant="ghost" onClick={newFile}><span aria-hidden="true">+</span> New file</Button>
      </div>
      <div class="pg-toolbar" role="toolbar" aria-label="File actions">
        <Button variant="primary" onClick={run} disabled={runner.state.running} kbd={kbdRun}>
          <Icon name="play" size={14} /> {runner.state.running ? 'Running…' : 'Run'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setRenaming({ id: active.id, value: active.name })}>Rename</Button>
        <Button size="sm" variant="ghost" onClick={() => remove(active)}>Delete</Button>
        <span class="spacer" />
        <span class="faint pg-note">Programs that use input() replay from the top each time you type a line.</span>
      </div>
      <div class="pg-main">
        <div class="pg-editor">
          <CodeEditor
            key={active.id}
            value={active.code}
            onChange={(v) => update(active.id, { code: v })}
            markers={markers}
            onRun={run}
            ariaLabel={`Code editor for ${active.name}`}
            fill
          />
        </div>
        <PanelTabs
          label="Playground panels"
          class="pg-panel"
          active={tab}
          onChange={setTab}
          tabs={[
            {
              id: 'output', label: 'Output', badge: runErr ? '!' : null, tone: 'bad',
              content: <Terminal state={runner.state} onInput={runner.answer} onClear={runner.clear} onExplain={() => setTab('explain')} />,
            },
            {
              id: 'input', label: 'Input', badge: stdinLines(active.stdin).length || null,
              content: (
                <div class="stdin-box">
                  <label for="pg-stdin"><strong>Input lines</strong> for {active.name}</label>
                  <textarea id="pg-stdin" value={active.stdin} spellcheck={false} onInput={(e) => update(active.id, { stdin: e.currentTarget.value })} placeholder={'One line per input() call, e.g.\nAda\n42'} />
                  <p>Each line answers one <code>input()</code> call, in order. If the program asks for more, the Output tab asks you to type it.</p>
                </div>
              ),
            },
            {
              id: 'problems', label: 'Problems', badge: problemCount || null, tone: syntaxError ? 'bad' : 'hint',
              content: <ProblemsList syntaxError={syntaxError} flags={flags} />,
            },
            {
              id: 'explain', label: 'Explain', badge: runErr ? '!' : null, tone: 'bad',
              content: <ExplainError error={runErr} code={active.code} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
