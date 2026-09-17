// Scratch editor for read formats: a dark editor card preloaded with the question's code, a small Run button in
// the tab row and an OUTPUT area at the bottom of the card. Nothing is graded; runs are logged as 'run' events.
import { useMemo, useRef, useState } from 'preact/hooks';
import type { TopicId } from '../../content/ids.ts';
import type { Question } from '../../content/schema.ts';
import { Button } from '../components/Button.tsx';
import { CodeEditor } from '../editor/CodeEditor.tsx';
import { EditorCard } from './EditorCard.tsx';
import { useProgramRunner } from './runner.ts';
import { MOD } from './shortcuts.ts';
import { Terminal } from './Terminal.tsx';
import './questionPage.css';

export function scratchCodeFor(q: Question): string {
  switch (q.format) {
    case 'predict':
    case 'trace':
    case 'errorTranslator':
      return q.code;
    case 'mcq':
    case 'multi':
      return q.code ?? '# Try out an idea from the question here, then press Run.\n';
    case 'twins':
      return `# Version A\n${q.left.trimEnd()}\n\n# Version B\n${q.right.trimEnd()}\n`;
    default:
      return '';
  }
}

export function ScratchEditor({ q, topicId }: { q: Question; topicId: TopicId }) {
  const initial = useMemo(() => scratchCodeFor(q), [q]);
  const [code, setCode] = useState(initial);
  const program = useProgramRunner({ qid: q.id, topicId });
  const rootRef = useRef<HTMLDivElement>(null);
  const stdin = q.format === 'predict' ? q.stdin ?? [] : [];
  const running = program.state.running;
  const run = () => {
    if (running || !code.trim()) return;
    void program.run(code, stdin);
  };

  return (
    <div class="scratch" ref={rootRef}>
      <div class="scratch-head">
        <span class="eyebrow">Scratch editor</span>
        <span class="scratch-note">Nothing leaves your browser</span>
      </div>
      <EditorCard
        file="main.py"
        label="Scratch editor"
        tabActions={
          <Button variant="primary" size="sm" class="scratch-run" onClick={run} disabled={running || !code.trim()} icon="play" aria-keyshortcuts={MOD === '⌘' ? 'Meta+Enter' : 'Control+Enter'}>
            {running ? 'Running…' : 'Run'}
          </Button>
        }
        below={
          <div class="ed-output">
            <div class="ed-output-label">Output</div>
            <Terminal state={program.state} onInput={program.answer} emptyText={`Press Run (${MOD} + Enter) to see what this code prints.`} replayNote={false} />
          </div>
        }
      >
        <CodeEditor
          value={code}
          onChange={setCode}
          onRun={run}
          ariaLabel="Scratch editor for experimenting with the question's code. Not graded. Press Escape then Tab to leave the editor."
          hideHint
          minHeight={220}
          maxHeight={460}
        />
      </EditorCard>
      {code !== initial ? (
        <button type="button" class="text-link quiet scratch-reset" onClick={() => { setCode(initial); program.clear(); }}>
          Put the question's code back
        </button>
      ) : null}
    </div>
  );
}
