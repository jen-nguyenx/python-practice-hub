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
import type { OptionRowProps } from './shared.tsx';
import { Ask, CheckBar, Label, Mark, MissingData, OptionRow, OutputBlock, ReadFrame, cx, useDraftState, visibility } from './shared.tsx';

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
    status = <span><Mark ok={judged.correct} />{!judged.correct ? ` ${right} of 3 parts right.` : null}</span>;
  }

  // Short text version of the line tags, for narrow panes where the tags are reduced to gutter icons.
  const summaryParts: string[] = [];
  if (draft.line !== null) summaryParts.push(`You picked line ${draft.line}${mLine === null ? '' : mLine ? ': correct' : ': not quite'}.`);
  if (showAnswer && err && !(draft.line === err.line && mLine)) summaryParts.push(`Line ${err.line} raised the error.`);
  const lineSummary = summaryParts.join(' ');

  const onLineKey = (idx: number) => (e: JSX.TargetedKeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const buttons = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('button.rf-line') ?? []);
    const pos = buttons.findIndex((b) => Number(b.dataset.line) === idx + 1);
    const next = buttons[pos + (e.key === 'ArrowDown' ? 1 : -1)];
    next?.focus();
  };

  const optionTone = (selected: boolean, mark: boolean | null, isRight: boolean) => {
    let tone: OptionRowProps['tone'] = null;
    let m: OptionRowProps['mark'] = null;
    if (selected && mark !== null) { tone = mark ? 'ok' : 'bad'; m = { ok: mark, label: mark ? 'Correct' : 'Not this one' }; }
    else if (isRight) { tone = 'answer'; m = { ok: true, label: 'Correct answer' }; }
    return { tone, mark: m };
  };

  return (
    <ReadFrame
      kind="et" rootRef={rootRef} onCheck={check}
      bar={
        <CheckBar
          vis={vis} revealed={props.revealed} locked={props.locked} checksLeft={props.checksLeft}
          ready={ready} notReadyText="Pick a line, an exception and a cause first" missing={missing} submitted={submitted}
          onCheck={check} status={status}
        />
      }
    >
      {missing ? <MissingData /> : null}
      <fieldset class="rf-fieldset">
        <Ask mark={mLine}>Which line raised the error?</Ask>
        <p class="sr-only" id={`${name}-lines-help`}>Select a line of code. Arrow keys move between lines.</p>
        <div class="rf-lines" role="group" aria-describedby={`${name}-lines-help`}>
          {lines.map((text, i) => {
            const n = i + 1;
            if (text.trim() === '') {
              return <div key={i} class="rf-line blank" aria-hidden="true"><span class="rf-line-gut" /><span class="rf-line-no">{n}</span><span class="rf-line-code">{' '}</span></div>;
            }
            const selected = draft.line === n;
            const isRaise = showAnswer && err?.line === n;
            const markThis = selected && mLine !== null;
            // The line that really raised gets a red tint once known; a wrong pick stays neutral with a red mark.
            const tone = markThis ? (mLine ? 'raised' : 'wrong') : isRaise ? 'raised' : '';
            let tag: { text: string; icon: 'check' | 'x' | 'alert' | 'target'; tone: string } | null = null;
            if (markThis) tag = mLine ? { text: 'Correct: raised here', icon: 'check', tone: 'ok' } : { text: 'Not this line', icon: 'x', tone: 'bad' };
            else if (isRaise) tag = { text: 'Raised here', icon: 'alert', tone: 'raised' };
            else if (selected) tag = { text: 'Your pick', icon: 'target', tone: 'pick' };
            const aria = `Line ${n}: ${text.trim()}${markThis ? (mLine ? '. Your pick: correct' : '. Your pick: not quite') : ''}${isRaise && !(markThis && mLine) ? '. Raised here' : ''}`;
            return (
              <button
                key={i} type="button" class={cx('rf-line', selected && 'selected', tone)} data-line={n}
                aria-pressed={selected}
                aria-label={aria}
                aria-disabled={vis.inputLocked ? 'true' : undefined}
                onClick={() => set({ line: n })}
                onKeyDown={onLineKey(i)}
              >
                <span class={cx('rf-line-gut', tag?.tone)} aria-hidden="true">{tag ? <Icon name={tag.icon} size={14} /> : null}</span>
                <span class="rf-line-no" aria-hidden="true">{n}</span>
                <span class="rf-line-code" aria-hidden="true">{codeTokens(text)}</span>
                {tag ? (
                  <span class={cx('rf-line-tag', tag.tone)} aria-hidden="true">
                    <Icon name={tag.icon} size={12} />{tag.text}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {lineSummary ? <p class="rf-note rf-lines-summary" aria-hidden="true">{lineSummary}</p> : null}
      </fieldset>

      <fieldset class="rf-fieldset">
        <Ask>Which exception?</Ask>
        <div class="rf-opts rf-opts-2">
          {q.exceptionOptions.map((ex) => {
            const selected = draft.exception === ex;
            const t = optionTone(selected, mExc, showAnswer && err?.type === ex);
            return (
              <OptionRow key={ex} type="radio" name={`${name}-exc`} value={ex} checked={selected} disabled={vis.inputLocked}
                onChange={() => set({ exception: ex })} onEnter={check} tone={t.tone} mark={t.mark}>
                <code class="rf-opt-code">{ex}</code>
              </OptionRow>
            );
          })}
        </div>
      </fieldset>

      <fieldset class="rf-fieldset">
        <Ask>What caused it?</Ask>
        <div class="rf-opts">
          {q.causes.map((c) => {
            const selected = draft.causeId === c.id;
            const t = optionTone(selected, mCause, showAnswer && c.id === correctCause);
            return (
              <OptionRow key={c.id} type="radio" name={`${name}-cause`} value={c.id} checked={selected} disabled={vis.inputLocked}
                onChange={() => set({ causeId: c.id })} onEnter={check} tone={t.tone} mark={t.mark}>
                <Markdown text={c.text} class="rf-opt-md" />
              </OptionRow>
            );
          })}
        </div>
      </fieldset>

      {showAnswer && err ? (
        <div class="rf-field">
          <Label>What Python reported</Label>
          <pre class="rf-output rf-traceback">Line {err.line}: <span class="rf-exc">{err.type}</span>{err.message ? `: ${err.message}` : ''}</pre>
          {typeof generated?.stdout === 'string' && normalizeForDisplay(generated.stdout) !== '' ? (
            <div class="rf-field rf-expected">
              <Label>Printed before the crash</Label>
              <OutputBlock text={normalizeForDisplay(generated.stdout)} />
            </div>
          ) : null}
        </div>
      ) : null}
    </ReadFrame>
  );
}
