// Playground (#/playground): free coding space with scratch files, Run with input, Output, Problems and Explain.
// Layout: one full-height dark card (file tabs + runtime + Run strip; editor | output split, stacked under 900px).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { shortcutSheetOpen } from '../shell/uiState.ts';
import type { AstFinding, PyError } from '../../runtime/protocol.ts';
import type { ScratchFile } from '../../store/types.ts';
import { py, store } from '../../app/services.ts';
import { Button } from '../components/Button.tsx';
import { Callout } from '../components/Callout.tsx';
import { CodeEditor } from '../editor/CodeEditor.tsx';
import { takePendingPlaygroundFile } from '../workbench/openInPlayground.ts';
import { backupScratch, takeScratchBackup } from '../workbench/unsaved.ts';
import { markersFrom } from '../workbench/plain.ts';
import { useProgramRunner } from '../workbench/runner.ts';
import { kbdRunShort, useRunShortcuts } from '../workbench/shortcuts.ts';
import { useConfirmDelete } from '../playground/ConfirmDelete.tsx';
import { CardIconButton, FileTabs } from '../playground/FileTabs.tsx';
import { OutputPane } from '../playground/OutputPane.tsx';
import type { OutputTab } from '../playground/OutputPane.tsx';
import { runtimeLabel } from '../playground/runtimeLabel.ts';
import { useMediaQuery, useSplit } from '../playground/useSplit.ts';
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
  const [renameRequest, setRenameRequest] = useState<string | null>(null);
  const [tab, setTab] = useState<OutputTab>('output');
  const [analysis, setAnalysis] = useState<{ syntaxError?: PyError; flags: AstFinding[] } | null>(null);
  const [confirmEl, confirmDelete] = useConfirmDelete();
  const runner = useProgramRunner({ qid: null, topicId: null });
  const status = py.status.value;
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latest = useRef<ScratchFile[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stacked = useMediaQuery('(max-width: 899px)');
  const { split, dragging, separatorProps } = useSplit(bodyRef, !stacked);

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
    if (id === activeId) return;
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
    setRenameRequest(f.id);
  };

  const rename = (id: string, value: string): string | null => {
    const current = latest.current;
    const raw = value.trim();
    if (!raw) return 'Type a file name.';
    const name = /\.py$/i.test(raw) ? raw : `${raw}.py`;
    if (/[\\/]/.test(name)) return 'File names cannot contain / or \\.';
    if (current.some((f) => f.id !== id && f.name.toLowerCase() === name.toLowerCase())) return 'Another file already has that name.';
    if (current.find((f) => f.id === id)?.name !== name) update(id, { name });
    return null;
  };

  const remove = async (f: ScratchFile) => {
    if (!(await confirmDelete(f))) return;
    const current = latest.current;
    const t = saveTimers.current.get(f.id);
    if (t) clearTimeout(t);
    saveTimers.current.delete(f.id);
    await store.deleteScratch(f.id).catch(() => undefined);
    let next = current.filter((x) => x.id !== f.id);
    if (!next.length) {
      const blank: ScratchFile = { id: newId(), name: 'untitled.py', code: '', stdin: '', updatedAt: Date.now() };
      next = [blank];
      store.saveScratch(blank).catch(() => undefined);
    }
    latest.current = next;
    setFiles(next);
    if (activeId === f.id) {
      const nextId = next[Math.max(0, current.findIndex((x) => x.id === f.id) - 1)]?.id ?? next[0].id;
      setActiveId(nextId);
      writeActive(nextId);
      setAnalysis(null);
      runner.clear();
    }
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
    // Input lines are typed into the Output pane when the program asks (replayed from the top each time).
    void runner.run(active.code, []);
  };
  useRunShortcuts({ onRun: run });

  const runErr = runner.state.result?.error ?? null;
  const syntaxError = analysis?.syntaxError ?? (runErr?.type === 'SyntaxError' || runErr?.type === 'IndentationError' ? runErr : null);
  const flags = analysis?.flags ?? EMPTY;
  const runIsSyntax = runErr?.type === 'SyntaxError' || runErr?.type === 'IndentationError';
  const markers = useMemo(
    () => markersFrom({ syntaxError, runtimeError: runErr && !runIsSyntax ? runErr : null, flags }),
    [syntaxError, runErr, flags],
  );

  const editorHelp = 'Esc then Tab leaves the editor. Ctrl+M makes Tab move focus instead of indenting.';
  const bodyStyle = stacked ? undefined : { gridTemplateColumns: `minmax(0, ${split}fr) 1px minmax(0, ${100 - split}fr)` };

  return (
    <div class="pg">
      {confirmEl}
      <h1 class="sr-only">Playground</h1>
      {loadError ? <Callout tone="bad" title="Your saved files could not be opened" class="pg-callout">{loadError} Changes may not be saved.</Callout> : null}
      <div class="pg-card" data-run-scope>
        <div class="pg-strip">
          {files && active ? (
            <FileTabs
              files={files}
              activeId={active.id}
              onSelect={select}
              onAdd={newFile}
              onRename={rename}
              onDelete={remove}
              renameRequest={renameRequest}
              onRenameRequestHandled={() => setRenameRequest(null)}
            />
          ) : <div class="pg-files" />}
          <div class="pg-strip-end">
            <span class={`pg-runtime ${status.state}`} title="Your code runs on this computer. Nothing is sent anywhere.">{runtimeLabel(status)}</span>
            <CardIconButton
              icon="keyboard"
              label="Keyboard shortcuts"
              tip={`Keyboard shortcuts · ${editorHelp}`}
              class="pg-help"
              onClick={() => { shortcutSheetOpen.value = true; }}
            />
            <Button
              variant="primary"
              size="sm"
              class="pg-run"
              onClick={run}
              disabled={!active || runner.state.running}
              kbd={kbdRunShort}
              icon="play"
              aria-keyshortcuts="Meta+Enter Control+Enter"
            >
              {runner.state.running ? 'Running…' : 'Run'}
            </Button>
          </div>
        </div>
        <div class={`pg-body${stacked ? ' stacked' : ''}${dragging ? ' dragging' : ''}`} ref={bodyRef} style={bodyStyle}>
          <div class="pg-editor">
            {active ? (
              <CodeEditor
                key={active.id}
                value={active.code}
                onChange={(v) => update(active.id, { code: v })}
                markers={markers}
                onRun={run}
                ariaLabel={`Code editor for ${active.name}. Press Escape then Tab to leave the editor.`}
                hideHint
                fill
              />
            ) : (
              <p class="pg-loading">Opening your files…</p>
            )}
          </div>
          <div class="pg-divider" {...separatorProps} />
          <OutputPane
            tab={tab}
            onTab={setTab}
            state={runner.state}
            onInput={runner.answer}
            onClear={runner.clear}
            onRestart={() => py.restart('retry after failure')}
            syntaxError={syntaxError}
            flags={flags}
            runError={runErr}
            code={code}
          />
        </div>
      </div>
    </div>
  );
}
