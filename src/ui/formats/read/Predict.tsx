// Predict the output: type what the program prints, or pick it from a list (choice mode).
import { useMemo, useRef, useState } from 'preact/hooks';
import type { FormatProps, GradeResult } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';
import { gradePredict, normalizeOutput } from '../../../engine/grade.ts';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { Icon } from '../../components/Icon.tsx';
import type { OutputDiffRow, Segment } from './logic.ts';
import { buildPredictChoices, isRecord, normalizeForDisplay, outputDiff } from './logic.ts';
import { CheckBar, Mark, MissingData, OutputBlock, checkShortcut, useDraftState, useNumberKeys, useSingleKeysOn, visibility, noAutocorrect } from './shared.tsx';

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

  return (
    <div class="rf rf-predict" ref={rootRef} onKeyDown={checkShortcut(check)}>
      <CodeBlock code={q.code} numbered label="Program" />
      {q.stdin && q.stdin.length ? (
        <p class="rf-stdin">
          <span class="muted">Input typed:</span>{' '}
          {q.stdin.map((s, i) => <code key={i} class="rf-stdin-item">{s}</code>)}
        </p>
      ) : null}
      {missing ? <MissingData /> : null}

      {q.choice ? (
        <fieldset class="rf-fieldset">
          <legend class="rf-legend">Which output does this program print?</legend>
          <div class="rf-options">
            {choices.map((c, i) => {
              const selected = draft.choice === c.text;
              const isCorrect = c.text === expected;
              const isJudged = judged !== null && judged.answer === c.text;
              let mark = null;
              let tone = '';
              if (isJudged) { mark = <Mark ok={judgedOk} label={judgedOk ? 'Your answer: correct' : 'Your answer: not quite'} />; tone = judgedOk ? 'ok' : 'bad'; }
              else if (vis.full && vis.marks && isCorrect) { mark = <Mark ok label="Correct answer" />; tone = 'ok'; }
              const cls = ['rf-option', selected ? 'selected' : '', vis.inputLocked ? 'locked' : '', tone].filter(Boolean).join(' ');
              return (
                <div class={cls} key={c.key}>
                  <label class="rf-option-main">
                    <input
                      type="radio" name={`predict-${q.id}`} data-key={c.key} value={c.key} checked={selected} disabled={vis.inputLocked}
                      onChange={() => pickChoice(c.text)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); check(); } }}
                    />
                    {keysOn && !vis.inputLocked && i < 5 ? <span class="rf-option-key" aria-hidden="true">{i + 1}</span> : null}
                    <span class="rf-option-body"><OutputBlock text={c.text} /></span>
                  </label>
                  {mark ? <div class="rf-option-mark">{mark}</div> : null}
                </div>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <div class="rf-field">
          <label class="rf-legend" for={`predict-${q.id}`}>What does this program print?</label>
          <p class="rf-help" id={`predict-${q.id}-help`}>Type exactly what is printed, one line per print.</p>
          <textarea
            id={`predict-${q.id}`}
            class={['rf-textarea', judged ? (judgedOk ? 'ok' : 'bad') : ''].filter(Boolean).join(' ')}
            aria-describedby={`predict-${q.id}-help`}
            rows={Math.max(4, draft.text.split('\n').length + 1)}
            value={draft.text}
            readOnly={vis.inputLocked}
            ref={noAutocorrect} autocomplete="off" autocapitalize="off" spellcheck={false}
            wrap="off"
            onInput={(e) => setDraft({ ...draft, text: e.currentTarget.value })}
          />
          {judged && !status ? <div class="rf-field-mark"><Mark ok={judgedOk} label={judgedOk ? 'Your answer: correct' : 'Your answer: not quite'} /></div> : null}
        </div>
      )}

      {vis.full && vis.marks && expected !== null && !q.choice ? (
        <div class="rf-reveal">
          <div class="rf-subhead">Expected output</div>
          <OutputBlock text={expected} label="Expected output" />
        </div>
      ) : null}
      {showDiff && diffRows ? <OutputDiff rows={diffRows} /> : null}

      <CheckBar
        vis={vis} revealed={props.revealed} locked={props.locked} checksLeft={props.checksLeft}
        ready={ready} notReadyText={q.choice ? 'Pick an output first.' : 'Type your prediction first.'} missing={missing} submitted={submitted}
        onCheck={check} status={status}
      />
    </div>
  );
}

function Segs({ segs }: { segs: Segment[] }) {
  if (segs.length === 0) return <span class="rf-diff-empty">(empty line)</span>;
  return <>{segs.map((s, i) => (s.diff ? <mark key={i} class="rf-diff-hl">{s.text}</mark> : <span key={i}>{s.text}</span>))}</>;
}

function OutputDiff({ rows }: { rows: OutputDiffRow[] }) {
  return (
    <div class="rf-reveal">
      <div class="rf-subhead">Your answer compared with the expected output</div>
      <div class="rf-diff" role="list">
        {rows.map((r, i) => {
          if (r.kind === 'same') {
            return <div key={i} class="rf-diff-row same" role="listitem"><span class="rf-diff-tag"><Icon name="check" size={12} /> Same</span><code class="rf-diff-text">{r.text || ' '}</code></div>;
          }
          if (r.kind === 'missing') {
            return <div key={i} class="rf-diff-row exp" role="listitem"><span class="rf-diff-tag">Missing</span><code class="rf-diff-text">{r.expected || '(empty line)'}</code></div>;
          }
          if (r.kind === 'extra') {
            return <div key={i} class="rf-diff-row you" role="listitem"><span class="rf-diff-tag"><Icon name="x" size={12} /> Extra</span><code class="rf-diff-text">{r.yours || '(empty line)'}</code></div>;
          }
          return (
            <div key={i} class="rf-diff-pair" role="listitem">
              <div class="rf-diff-row exp"><span class="rf-diff-tag">Expected</span><code class="rf-diff-text"><Segs segs={r.expected} /></code></div>
              <div class="rf-diff-row you"><span class="rf-diff-tag"><Icon name="x" size={12} /> You typed</span><code class="rf-diff-text"><Segs segs={r.yours} /></code></div>
            </div>
          );
        })}
      </div>
      <p class="rf-help">Spaces count. Highlighted characters are where the lines differ.</p>
    </div>
  );
}
