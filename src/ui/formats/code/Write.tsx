// Write code: function, program or project questions, in practice or paper (exam-style) mode.
import type { FormatProps } from '../../../engine/types.ts';
import type { Question, QuestionOf } from '../../../content/schema.ts';
import { gradeFromTests } from '../../../engine/grade.ts';
import { Chip } from '../../components/Chip.tsx';
import { marksEarned } from '../../workbench/ResultBanner.tsx';
import { CodeTask } from './CodeTask.tsx';

export function Write(props: FormatProps<QuestionOf<'write'>>) {
  const { q } = props;
  const paper = q.mode === 'paper' || props.mode === 'paper';
  return (
    <CodeTask
      fp={props as FormatProps<Question>}
      cfg={{
        initialCode: q.starter,
        resetTo: 'starter code',
        kind: q.kind,
        fnName: q.fnName,
        rules: q.rules,
        tests: q.tests,
        paper,
        marks: q.marks,
        editorLabel: paper ? `Answer for ${q.title} (exam-style editor)` : `Code for ${q.title}`,
        grade: (result) => gradeFromTests(q, result),
        status: paper && q.marks
          ? ({ graded }) => (graded ? (
            <Chip tone={graded.correct ? 'ok' : graded.score > 0 ? 'hint' : 'bad'}>
              {marksEarned(graded.score, q.marks!)} of {q.marks} marks
            </Chip>
          ) : null)
          : undefined,
      }}
    />
  );
}
