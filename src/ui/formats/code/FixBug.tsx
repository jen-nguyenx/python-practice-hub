// Fix the bug: start from buggy code, Run visible tests, Submit all tests. Minimal-fix badge; diff when revealed.
import type { FormatProps } from '../../../engine/types.ts';
import type { Question, QuestionOf } from '../../../content/schema.ts';
import { changedLineCount, gradeFromTests } from '../../../engine/grade.ts';
import { Chip } from '../../components/Chip.tsx';
import { Icon } from '../../components/Icon.tsx';
import { DiffView } from '../../workbench/DiffView.tsx';
import { CodeTask } from './CodeTask.tsx';

export function FixBug(props: FormatProps<QuestionOf<'fixBug'>>) {
  const { q } = props;
  const limit = q.maxChangedLines;
  return (
    <CodeTask
      fp={props as FormatProps<Question>}
      cfg={{
        initialCode: q.buggy,
        resetTo: 'original code',
        kind: 'function',
        fnName: q.fnName,
        tests: q.tests,
        paper: false,
        editorLabel: `Buggy code for ${q.title}`,
        grade: (result) => gradeFromTests(q, result),
        status: ({ code, graded }) => {
          const changed = safeChanged(q.buggy, code);
          const minimal = changed <= limit;
          return (
            <>
              <Chip tone={changed === 0 ? undefined : minimal ? 'accent' : 'hint'} title={`A minimal fix changes ${limit} ${limit === 1 ? 'line' : 'lines'} or fewer. Changing more does not lower your score.`}>
                {changed === 0 ? 'No lines changed yet' : `${changed} ${changed === 1 ? 'line' : 'lines'} changed`}
              </Chip>
              {graded?.correct && minimal ? (
                <Chip tone="ok"><Icon name="check" size={12} /> Minimal fix</Chip>
              ) : (
                <span class="faint ct-status-note">Aim for a fix of {limit} {limit === 1 ? 'line' : 'lines'} or fewer.</span>
              )}
            </>
          );
        },
        revealedView: () => (q.solution.code ? (
          <section class="stack" aria-label="What changed">
            <h3 class="label">The fix</h3>
            <DiffView before={q.buggy} after={q.solution.code} beforeLabel="Buggy code" afterLabel="Fixed code" />
          </section>
        ) : null),
      }}
    />
  );
}

function safeChanged(a: string, b: string) {
  try {
    return changedLineCount(a, b);
  } catch {
    return 0;
  }
}
