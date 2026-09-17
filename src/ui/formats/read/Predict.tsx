// Predict the output: type what the program prints, or pick it from a list (choice mode).
import { useMemo, useRef, useState } from 'preact/hooks';
import type { FormatProps, GradeResult } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';
import { gradePredict, normalizeOutput } from '../../../engine/grade.ts';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { Icon } from '../../components/Icon.tsx';
import type { OutputDiffRow, Segment } from './logic.ts';
import { buildPredictChoices, isRecord, normalizeForDisplay, outputDiff } from './logic.ts';
import type { OptionRowProps } from './shared.tsx';
import {
  CheckBar, Label, Mark, MissingData, OptionRow, OutputBlock, ReadFrame, TerminalInput,
  useDraftState, useNumberKeys, useSingleKeysOn, visibility,
} from './shared.tsx';

type Q = QuestionOf<'predict'>;
interface PredictDraft { text: string; choice: string | null }

export function Predict(props: FormatProps<Q>) {
  return <PredictBody key={props.q.id} {...props} />;
}

function PredictBody(props: FormatProps<Q>) {
  const { q, generated } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const expected = typeof generated?.stdout === 'string' ? normalizeForDisplay(generated.stdout) : null;
  const missing = expected === null;
  const choices = useMemo(
    () => (q.choice && expected !== null ? buildPredictChoices(q.id, expected, generated?.mutantOutputs) : []),
    [q.id, q.choice, expected, generated?.mutantOutputs],
  );
  const [draft, setDraft] = useDraftState<PredictDraft>(
    props.draft, props.onDraft,
    (d) => (isRecord(d) ? { text: typeof d.text === 'string' ? d.text : '', choice: typeof d.choice === 'string' ? d.choice : null } : null),
    () => ({ text: '', choice: null }),
  );
  const [checked, setChecked] = useState<{ answer: string; result: GradeResult } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const vis = visibility(props, checked !== null, submitted);

  const choiceValid = draft.choice !== null && choices.some((c) => c.text === draft.choice);
  const answer = q.choice ? (choiceValid ? (draft.choice as string) : null) : draft.text;
  const ready = q.choice ? answer !== null : draft.text.trim() !== '';
  const canCheck = ready && !missing && !vis.inputLocked && props.checksLeft > 0;

  const check = () => {
    if (!canCheck || answer === null) return;
    const result = gradePredict(q, answer, generated);
    setChecked({ answer, result });
    if (vis.testMode) setSubmitted(true);
    props.onCheck(result, { answer });
  };

  const pickChoice = (text: string, focusKey?: string) => {
    if (vis.inputLocked) return;
    setDraft({ ...draft, choice: text });
    if (focusKey) rootRef.current?.querySelector<HTMLInputElement>(`input[data-key="${focusKey}"]`)?.focus();
  };
  const keysOn = useSingleKeysOn();
  useNumberKeys(!!q.choice && !vis.inputLocked && !missing, choices.length, (i) => { const c = choices[i]; if (c) pickChoice(c.text, c.key); });

  // The answer being judged: the checked one while it is unchanged, or the current one once the answer is out.
  const same = (a: string | null, b: string | null) => a !== null && b !== null && (q.choice ? a === b : normalizeOutput(a) === normalizeOutput(b));
  const judged = !vis.marks ? null
    : checked && (vis.full || same(checked.answer, answer)) ? checked
    : vis.full && answer !== null && answer.trim() !== '' && !missing ? { answer, result: gradePredict(q, answer, generated) } : null;
  const judgedOk = judged !== null && judged.result.correct;

  const diffRows = judged && !judgedOk && vis.full && expected !== null && !q.choice ? outputDiff(normalizeOutput(expected), normalizeOutput(judged.answer)) : null;
  const showDiff = diffRows !== null && diffRows.some((r) => r.kind !== 'same');

  let status = null;
  if (!vis.testMode && checked && judged === checked) status = <Mark ok={judgedOk} />;

  const inputId = `predict-${q.id}`;

  return (
    <ReadFrame
      kind="predict" rootRef={rootRef} onCheck={check}
      bar={
        <CheckBar
          vis={vis} revealed={props.revealed} locked={props.locked} checksLeft={props.checksLeft}
          ready={ready} notReadyText={q.choice ? 'Pick an output first' : 'Type your prediction first'} missing={missing} submitted={submitted}
          onCheck={check} status={status}
        />
      }
    >
      <CodeBlock code={q.code} numbered label="Program" />
      {q.stdin && q.stdin.length ? (
        <p class="rf-stdin">
          <span class="rf-label-text">Input typed</span>
          {q.stdin.map((s, i) => <code key={i} class="rf-stdin-item">{s}</code>)}
        </p>
      ) : null}
      {missing ? <MissingData /> : null}

      {q.choice ? (
        <fieldset class="rf-fieldset">
          <legend class="sr-only">Which output does this program print?</legend>
          <div class="rf-opts">
            {choices.map((c, i) => {
              const isCorrect = c.text === expected;
              const isJudged = judged !== null && judged.answer === c.text;
              let tone: OptionRowProps['tone'] = null;
              let mark: OptionRowProps['mark'] = null;
              if (isJudged) { tone = judgedOk ? 'ok' : 'bad'; mark = { ok: judgedOk, label: judgedOk ? 'Correct' : 'Not this one' }; }
              else if (vis.full && vis.marks && isCorrect) { tone = 'answer'; mark = { ok: true, label: 'Correct answer' }; }
              return (
                <OptionRow
                  key={c.key} type="radio" name={`predict-${q.id}`} value={c.key} dataKey={c.key}
                  checked={draft.choice === c.text} disabled={vis.inputLocked}
                  onChange={() => pickChoice(c.text)} onEnter={check}
                  keyHint={keysOn && !vis.inputLocked && i < 5 ? i + 1 : null}
                  tone={tone} mark={mark}
                >
                  <OutputBlock text={c.text} bare />
                </OptionRow>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <div class="rf-field">
          <Label as="label" htmlFor={inputId} end={judged ? <Mark ok={judgedOk} /> : 'One line per print'}>Your output</Label>
          <TerminalInput
            id={inputId} value={draft.text} readOnly={vis.inputLocked} mark={judged ? judgedOk : null}
            onInput={(v) => setDraft({ ...draft, text: v })}
          />
        </div>
      )}

      {vis.full && vis.marks && expected !== null && !q.choice ? (
        <div class="rf-field">
          <Label end={showDiff ? 'Spaces count' : undefined}>Expected output</Label>
          {showDiff && diffRows ? <Compared rows={diffRows} /> : <OutputBlock text={expected} label="Expected output" />}
        </div>
      ) : null}
    </ReadFrame>
  );
}

function Segs({ segs, tone }: { segs: Segment[]; tone: 'ok' | 'bad' }) {
  if (segs.length === 0) return <span class="rf-cmp-empty">(empty line)</span>;
  return <>{segs.map((s, i) => (s.diff ? <mark key={i} class={`rf-cmp-hl ${tone}`}>{s.text}</mark> : <span key={i}>{s.text}</span>))}</>;
}

/** The expected output, line by line, with the student's differing lines shown in place. */
function Compared({ rows }: { rows: OutputDiffRow[] }) {
  return (
    <div class="rf-output rf-cmp" role="list" aria-label="Expected output compared with your answer">
      {rows.map((r, i) => {
        if (r.kind === 'same') {
          return <div key={i} class="rf-cmp-row" role="listitem"><span class="rf-cmp-gut" /><code class="rf-cmp-text">{r.text || ' '}</code><span class="sr-only">Same</span></div>;
        }
        if (r.kind === 'missing') {
          return (
            <div key={i} class="rf-cmp-row" role="listitem">
              <span class="rf-cmp-gut bad"><Icon name="x" size={12} /></span>
              <code class="rf-cmp-text">{r.expected || '(empty line)'}</code>
              <span class="rf-cmp-tag bad">missing</span>
            </div>
          );
        }
        if (r.kind === 'extra') {
          return (
            <div key={i} class="rf-cmp-row you" role="listitem">
              <span class="rf-cmp-gut bad"><Icon name="x" size={12} /></span>
              <code class="rf-cmp-text">{r.yours || '(empty line)'}</code>
              <span class="rf-cmp-tag bad">extra line you typed</span>
            </div>
          );
        }
        return (
          <div key={i} class="rf-cmp-pair" role="listitem">
            <div class="rf-cmp-row">
              <span class="rf-cmp-gut" />
              <code class="rf-cmp-text"><Segs segs={r.expected} tone="ok" /></code>
              <span class="rf-cmp-tag">expected</span>
            </div>
            <div class="rf-cmp-row you">
              <span class="rf-cmp-gut bad"><Icon name="x" size={12} /></span>
              <code class="rf-cmp-text"><Segs segs={r.yours} tone="bad" /></code>
              <span class="rf-cmp-tag bad">you typed</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
