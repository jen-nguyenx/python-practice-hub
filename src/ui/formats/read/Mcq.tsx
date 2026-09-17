// Multiple choice (and true/false with two options). Graded by option id.
import { useRef, useState } from 'preact/hooks';
import type { FormatProps, GradeResult } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';
import { gradeMcq } from '../../../engine/grade.ts';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { isRecord } from './logic.ts';
import { CheckBar, Mark, OptionRow, OptionText, ReadFrame, useDraftState, useNumberKeys, useSingleKeysOn, visibility } from './shared.tsx';

type Q = QuestionOf<'mcq'>;
interface McqDraft { choice: string | null }

export function Mcq(props: FormatProps<Q>) {
  return <McqBody key={props.q.id} {...props} />;
}

function McqBody(props: FormatProps<Q>) {
  const { q } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useDraftState<McqDraft>(
    props.draft, props.onDraft,
    (d) => (isRecord(d) && typeof d.choice === 'string' && q.options.some((o) => o.id === d.choice) ? { choice: d.choice } : null),
    () => ({ choice: null }),
  );
  const [checked, setChecked] = useState<{ choice: string; result: GradeResult } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const vis = visibility(props, checked !== null, submitted);
  const choice = draft.choice;
  const correctId = q.options.find((o) => o.correct)?.id ?? null;
  const ready = choice !== null;
  const canCheck = ready && !vis.inputLocked && props.checksLeft > 0;
  const name = `mcq-${q.id}`;

  const check = () => {
    if (!canCheck || choice === null) return;
    const result = gradeMcq(q, choice);
    setChecked({ choice, result });
    if (vis.testMode) setSubmitted(true);
    props.onCheck(result, { choice });
  };

  const pick = (id: string, focus = false) => {
    if (vis.inputLocked) return;
    setDraft({ choice: id });
    if (focus) rootRef.current?.querySelector<HTMLInputElement>(`input[value="${CSS.escape(id)}"]`)?.focus();
  };
  const keysOn = useSingleKeysOn();
  useNumberKeys(!vis.inputLocked, q.options.length, (i) => { const o = q.options[i]; if (o) pick(o.id, true); });

  // What to mark: the checked answer (or the current one once the answer is out).
  // Before the answer is out, a mark only stays while the checked choice is still selected.
  const markedChoice = !vis.marks ? null
    : vis.full ? (checked?.choice ?? choice)
    : checked && checked.choice === choice ? choice : null;
  const showCorrect = vis.full && vis.marks;

  let status = null;
  if (!vis.testMode && checked && markedChoice === checked.choice) status = <Mark ok={checked.choice === correctId} />;

  return (
    <ReadFrame
      kind="mcq" rootRef={rootRef} onCheck={check}
      bar={
        <CheckBar
          vis={vis} revealed={props.revealed} locked={props.locked} checksLeft={props.checksLeft}
          ready={ready} notReadyText="Pick an answer first" missing={false} submitted={submitted}
          onCheck={check} status={status}
        />
      }
    >
      {q.code ? <CodeBlock code={q.code} numbered label="Code for this question" /> : null}
      <fieldset class="rf-fieldset">
        <legend class="sr-only">Choose one answer</legend>
        <div class="rf-opts">
          {q.options.map((o, i) => {
            const isCorrect = o.id === correctId;
            const chosen = markedChoice === o.id;
            let tone: 'ok' | 'bad' | 'answer' | null = null;
            let mark = null;
            if (chosen) { tone = isCorrect ? 'ok' : 'bad'; mark = { ok: isCorrect, label: isCorrect ? 'Correct' : 'Not this one' }; }
            else if (showCorrect && isCorrect) { tone = 'answer'; mark = { ok: true, label: 'Correct answer' }; }
            return (
              <OptionRow
                key={o.id} type="radio" name={name} value={o.id}
                checked={choice === o.id} disabled={vis.inputLocked}
                onChange={() => pick(o.id)} onEnter={check}
                keyHint={keysOn && !vis.inputLocked && i < 5 ? i + 1 : null}
                tone={tone} mark={mark}
                why={chosen || tone === 'answer' ? o.why : null}
                whyToggle={props.revealed && vis.marks && !chosen && tone !== 'answer' ? o.why : null}
                whyToggleLabel="Why not"
              >
                <OptionText text={o.text} />
              </OptionRow>
            );
          })}
        </div>
      </fieldset>
    </ReadFrame>
  );
}
