// Error translator: pick the line that raised, the exception type, and the cause.
import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
import type { FormatProps, GradeResult } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';
import { gradeErrorTranslator } from '../../../engine/grade.ts';
import { Icon } from '../../components/Icon.tsx';
import { Markdown } from '../../components/Markdown.tsx';
import { tokenize } from '../../components/highlight.ts';
import { isRecord, normalizeForDisplay } from './logic.ts';
import { CheckBar, Mark, MissingData, OutputBlock, checkShortcut, useDraftState, visibility } from './shared.tsx';

type Q = QuestionOf<'errorTranslator'>;
interface EtDraft { line: number | null; exception: string | null; causeId: string | null }
type Parts = { line: boolean; exception: boolean; cause: boolean };
type Checked = { answer: EtDraft; result: GradeResult & { parts: Parts } };

export function ErrorTranslator(props: FormatProps<Q>) {
  return <ErrorTranslatorBody key={props.q.id} {...props} />;
}

function codeTokens(line: string) {
  return tokenize(line).map((tok, i) => (tok.t === 'p' ? tok.v : <span key={i} class={`tok-${tok.t}`}>{tok.v}</span>));
}

function ErrorTranslatorBody(props: FormatProps<Q>) {
  const { q, generated } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const err = generated?.error && typeof generated.error.type === 'string' && typeof generated.error.line === 'number' ? generated.error : null;
  const missing = err === null;
  const lines = q.code.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
  const [draft, setDraft] = useDraftState<EtDraft>(
    props.draft, props.onDraft,
    (d) => (isRecord(d) ? {
      line: typeof d.line === 'number' && d.line >= 1 && d.line <= lines.length ? d.line : null,
      exception: typeof d.exception === 'string' && q.exceptionOptions.includes(d.exception) ? d.exception : null,
      causeId: typeof d.causeId === 'string' && q.causes.some((c) => c.id === d.causeId) ? d.causeId : null,
    } : null),
    () => ({ line: null, exception: null, causeId: null }),
  );
  const [checked, setChecked] = useState<Checked | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const vis = visibility(props, checked !== null, submitted);
  const ready = draft.line !== null && draft.exception !== null && draft.causeId !== null;
  const canCheck = ready && !missing && !vis.inputLocked && props.checksLeft > 0;
  const name = `et-${q.id}`;

  const check = () => {
    if (!canCheck) return;
    const answer = { ...draft };
    const result = gradeErrorTranslator(q, answer, generated);
    setChecked({ answer, result });
    if (vis.testMode) setSubmitted(true);
    props.onCheck(result, answer);
  };
  const set = (patch: Partial<EtDraft>) => { if (!vis.inputLocked) setDraft({ ...draft, ...patch }); };

  const fresh = vis.marks && vis.full && !missing && (!checked || props.revealed) ? gradeErrorTranslator(q, draft, generated) : null;
  const partMark = (part: keyof Parts): boolean | null => {
    if (!vis.marks) return null;
    const key = part === 'cause' ? 'causeId' : part;
    if (fresh) return draft[key] === null && !checked ? null : fresh.parts[part];
    if (!checked || checked.answer[key] !== draft[key]) return null;
    return checked.result.parts[part];
  };
  const mLine = partMark('line');
  const mExc = partMark('exception');
  const mCause = partMark('cause');
  const showAnswer = vis.full && vis.marks && err !== null;
  const correctCause = q.causes.find((c) => c.correct)?.id ?? null;

  let status = null;
  const judged = fresh ?? (checked && vis.marks ? checked.result : null);
  if (!vis.testMode && judged && mLine !== null && mExc !== null && mCause !== null) {
    const right = [mLine, mExc, mCause].filter(Boolean).length;
    status = (
      <span class="rf-status-line">
        <Mark ok={judged.correct} />
        {!judged.correct ? <span class="muted num"> {right} of 3 parts right.</span> : null}
      </span>
    );
  }

  // Short text version of the line tags; shown when the container is too narrow for the tags themselves.
  const summaryParts: string[] = [];
  if (draft.line !== null) summaryParts.push(`You picked line ${draft.line}${mLine === null ? '' : mLine ? ': correct' : ': not quite'}.`);
  if (showAnswer && err) summaryParts.push(`Line ${err.line} raised the error.`);
  const lineSummary = summaryParts.join(' ');

  const onLineKey = (idx: number) => (e: JSX.TargetedKeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const buttons = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('button.rf-line') ?? []);
    const pos = buttons.findIndex((b) => Number(b.dataset.line) === idx + 1);
    const next = buttons[pos + (e.key === 'ArrowDown' ? 1 : -1)];
    next?.focus();
  };

  const partHead = (text: string, mark: boolean | null) => (
    <legend class="rf-legend">
      {text}
      {mark !== null ? <span class="rf-legend-mark"><Mark ok={mark} /></span> : null}
    </legend>
  );

  return (
    <div class="rf rf-et" ref={rootRef} onKeyDown={checkShortcut(check)}>
      {missing ? <MissingData /> : null}
      <fieldset class="rf-fieldset">
        {partHead('1. Which line raised the error?', mLine)}
        <p class="rf-help" id={`${name}-lines-help`}>Select a line of code.</p>
        <div class="rf-lines code-block" role="group" aria-describedby={`${name}-lines-help`}>
          {lines.map((text, i) => {
            const n = i + 1;
            if (text.trim() === '') return <div key={i} class="rf-line blank" aria-hidden="true"><span class="rf-line-icon" /><span class="rf-line-no">{n}</span><span class="rf-line-code">{' '}</span></div>;
            const selected = draft.line === n;
            const isRaise = showAnswer && err?.line === n;
            const markThis = selected && mLine !== null;
            const tone = markThis ? (mLine ? 'ok' : 'bad') : isRaise ? 'ok' : '';
            const cls = ['rf-line', selected ? 'selected' : '', tone].filter(Boolean).join(' ');
            const tag = markThis ? (mLine ? 'Your pick: correct' : 'Your pick: not quite') : selected ? 'Your pick' : isRaise ? 'Raised here' : null;
            const tagIcon = markThis ? (mLine ? 'check' : 'x') : selected ? 'target' : 'alert';
            const raiseNote = isRaise && tag !== 'Raised here' && !(markThis && mLine) ? ' (raised here)' : '';
            return (
              <button
                key={i} type="button" class={cls} data-line={n}
                aria-pressed={selected}
                aria-label={`Line ${n}: ${text.trim()}${tag && tag !== 'Your pick' ? `. ${tag}` : ''}${raiseNote}`}
                aria-disabled={vis.inputLocked ? 'true' : undefined}
                onClick={() => set({ line: n })}
                onKeyDown={onLineKey(i)}
              >
                <span class="rf-line-icon" aria-hidden="true">{tag ? <Icon name={tagIcon} size={12} /> : null}</span>
                <span class="rf-line-no" aria-hidden="true">{n}</span>
                <span class="rf-line-code" aria-hidden="true">{codeTokens(text)}</span>
                {tag ? <span class="rf-line-tag" aria-hidden="true"><Icon name={tagIcon} size={12} />{tag}</span> : null}
                {raiseNote ? <span class="rf-line-tag ok" aria-hidden="true"><Icon name="alert" size={12} />Raised here</span> : null}
              </button>
            );
          })}
        </div>
        {lineSummary ? <p class="rf-help rf-lines-summary" aria-hidden="true">{lineSummary}</p> : null}
      </fieldset>

      <fieldset class="rf-fieldset">
        {partHead('2. What type of exception?', mExc)}
        <div class="rf-options rf-exc-grid">
          {q.exceptionOptions.map((ex) => {
            const selected = draft.exception === ex;
            const isRight = showAnswer && err?.type === ex;
            const markThis = selected && mExc !== null;
            const tone = markThis ? (mExc ? 'ok' : 'bad') : isRight ? 'ok' : '';
            const cls = ['rf-option', selected ? 'selected' : '', vis.inputLocked ? 'locked' : '', tone].filter(Boolean).join(' ');
            return (
              <div class={cls} key={ex}>
                <label class="rf-option-main">
                  <input type="radio" name={`${name}-exc`} value={ex} checked={selected} disabled={vis.inputLocked} onChange={() => set({ exception: ex })} />
                  <span class="rf-option-body"><code class="rf-exc-name">{ex}</code></span>
                </label>
                {markThis ? <div class="rf-option-mark"><Mark ok={!!mExc} label={mExc ? 'Your answer: correct' : 'Your answer: not quite'} /></div>
                  : isRight ? <div class="rf-option-mark"><Mark ok label="Correct answer" /></div> : null}
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset class="rf-fieldset">
        {partHead('3. What caused it?', mCause)}
        <div class="rf-options">
          {q.causes.map((c) => {
            const selected = draft.causeId === c.id;
            const isRight = showAnswer && c.id === correctCause;
            const markThis = selected && mCause !== null;
            const tone = markThis ? (mCause ? 'ok' : 'bad') : isRight ? 'ok' : '';
            const cls = ['rf-option', selected ? 'selected' : '', vis.inputLocked ? 'locked' : '', tone].filter(Boolean).join(' ');
            return (
              <div class={cls} key={c.id}>
                <label class="rf-option-main">
                  <input type="radio" name={`${name}-cause`} value={c.id} checked={selected} disabled={vis.inputLocked} onChange={() => set({ causeId: c.id })} />
                  <span class="rf-option-body"><Markdown text={c.text} class="rf-option-md" /></span>
                </label>
                {markThis ? <div class="rf-option-mark"><Mark ok={!!mCause} label={mCause ? 'Your answer: correct' : 'Your answer: not quite'} /></div>
                  : isRight ? <div class="rf-option-mark"><Mark ok label="Correct answer" /></div> : null}
              </div>
            );
          })}
        </div>
      </fieldset>

      {showAnswer && err ? (
        <div class="rf-reveal">
          <div class="rf-subhead">What Python reported</div>
          <pre class="rf-traceback">Line {err.line}: {err.type}{err.message ? `: ${err.message}` : ''}</pre>
          {typeof generated?.stdout === 'string' && normalizeForDisplay(generated.stdout) !== '' ? (
            <>
              <div class="rf-subhead">Printed before the crash</div>
              <OutputBlock text={normalizeForDisplay(generated.stdout)} />
            </>
          ) : null}
        </div>
      ) : null}

      <CheckBar
        vis={vis} revealed={props.revealed} locked={props.locked} checksLeft={props.checksLeft}
        ready={ready} notReadyText="Pick a line, an exception type and a cause first." missing={missing} submitted={submitted}
        onCheck={check} status={status}
      />
    </div>
  );
}
