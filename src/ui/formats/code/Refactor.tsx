// Refactor: keep behaviour the same (tests) while removing a clumsy pattern and/or using an idiom.
import type { AstFlag } from '../../../content/ids.ts';
import type { FormatProps } from '../../../engine/types.ts';
import type { Question, QuestionOf } from '../../../content/schema.ts';
import type { TestsResult } from '../../../runtime/protocol.ts';
import { gradeRefactor } from '../../../engine/grade.ts';
import { PATTERNS } from '../../../content/patterns.ts';
import { Callout } from '../../components/Callout.tsx';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { Markdown } from '../../components/Markdown.tsx';
import { DiffView } from '../../workbench/DiffView.tsx';
import { FLAG_NAME } from '../../workbench/plain.ts';
import { CodeTask } from './CodeTask.tsx';

export function idiomGaps(q: QuestionOf<'refactor'>, result: TestsResult): { stillThere: AstFlag[]; missing: AstFlag[] } {
  const present = new Set(result.flags.map((f) => f.flag));
  return {
    stillThere: q.mustRemove.filter((f) => present.has(f)),
    missing: (q.mustAdd ?? []).filter((f) => !present.has(f)),
  };
}

export function Refactor(props: FormatProps<QuestionOf<'refactor'>>) {
  const { q } = props;
  const pattern = PATTERNS.find((p) => p.id === q.pattern);
  const goal = [
    ...q.mustRemove.map((f) => `remove ${FLAG_NAME[f] ?? f}`),
    ...(q.mustAdd ?? []).map((f) => `use ${FLAG_NAME[f] ?? f}`),
  ];
  return (
    <div class="stack">
      {goal.length ? (
        <div class="refactor-goal"><strong>Goal:</strong> keep every test passing, and <Markdown class="inline-md" text={goal.join('; ')} /></div>
      ) : null}
      <CodeTask
        fp={props as FormatProps<Question>}
        cfg={{
          initialCode: q.code,
          resetLabel: 'Reset to original',
          kind: 'function',
          fnName: q.fnName,
          tests: q.tests,
          paper: false,
          editorLabel: `Code to refactor for ${q.title}`,
          grade: (result) => gradeRefactor(q, result),
          afterSubmit: ({ result, graded }) => {
            if (result.compileError || result.topLevelError || result.missingFunction) return null;
            const testsOk = result.total > 0 && result.passed === result.total;
            const { stillThere, missing } = idiomGaps(q, result);
            if (!testsOk) {
              return <Callout tone="bad" title="Behaviour changed">A refactor must keep every test passing. Fix the failing tests first.</Callout>;
            }
            if (!stillThere.length && !missing.length) {
              return graded.correct ? <Callout tone="ok" title="Same behaviour, cleaner code">The tests still pass and the pattern is gone.</Callout> : null;
            }
            return (
              <Callout tone="hint" title="Tests pass, but the refactor is not finished">
                <ul class="refactor-gaps">
                  {stillThere.map((f) => <li key={f}><Markdown class="inline-md" text={`Still there: ${FLAG_NAME[f] ?? f}.`} /></li>)}
                  {missing.map((f) => <li key={f}><Markdown class="inline-md" text={`Not used yet: ${FLAG_NAME[f] ?? f}.`} /></li>)}
                </ul>
                {pattern ? (
                  <details class="pattern-card">
                    <summary>{pattern.title}</summary>
                    <Markdown text={pattern.why} />
                    <div class="pattern-pair">
                      <div><div class="label">Instead of</div><CodeBlock code={pattern.bad} /></div>
                      <div><div class="label">Write</div><CodeBlock code={pattern.good} /></div>
                    </div>
                  </details>
                ) : null}
              </Callout>
            );
          },
          revealedView: () => (q.solution.code ? (
            <section class="stack" aria-label="What changed">
              <h3 class="label">Original and refactored</h3>
              <DiffView before={q.code} after={q.solution.code} beforeLabel="Original" afterLabel="Refactored" />
            </section>
          ) : null),
        }}
      />
    </div>
  );
}
