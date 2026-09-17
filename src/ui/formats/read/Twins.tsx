// Spot the difference: two near-identical snippets. Do they print the same thing, and what does each print?
import { useMemo, useState } from 'preact/hooks';
import type { FormatProps, GradeResult } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';
import { gradeTwins, normalizeOutput } from '../../../engine/grade.ts';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { differingLines, isRecord, linesPhrase, normalizeForDisplay } from './logic.ts';
import { CheckBar, Mark, MissingData, OutputBlock, checkShortcut, useDraftState, visibility, noAutocorrect } from './shared.tsx';

type Q = QuestionOf<'twins'>;
interface TwinsDraft { differs: boolean | null; outLeft: string; outRight: string; /** Step 1 was already checked once. */ differsChecked?: boolean }
type Parts = { differs: boolean; left: boolean; right: boolean };
type Checked = { answer: { differs: boolean; outLeft: string; outRight: string }; result: GradeResult & { parts: Parts } };

export function Twins(props: FormatProps<Q>) {
  return <TwinsBody key={props.q.id} {...props} />;
}

function TwinsBody(props: FormatProps<Q>) {
  const { q, generated } = props;
  const twins = generated?.twins && typeof generated.twins.outLeft === 'string' && typeof generated.twins.outRight === 'string' ? generated.twins : null;
  const missing = twins === null;
  const diff = useMemo(() => differingLines(q.left, q.right), [q.left, q.right]);
  const [draft, setDraft] = useDraftState<TwinsDraft>(
    props.draft, props.onDraft,
    (d) => (isRecord(d) ? {
      differs: typeof d.differs === 'boolean' ? d.differs : null,
      outLeft: typeof d.outLeft === 'string' ? d.outLeft : '',
      outRight: typeof d.outRight === 'string' ? d.outRight : '',
      differsChecked: d.differsChecked === true && typeof d.differs === 'boolean',
    } : null),
    () => ({ differs: null, outLeft: '', outRight: '' }),
  );
  const [checked, setChecked] = useState<Checked | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const vis = visibility(props, checked !== null, submitted);
  // "Do they differ?" gets one attempt: after the first check it stays as answered.
  const differsLocked = vis.inputLocked || checked !== null || draft.differsChecked === true;
  const ready = draft.differs !== null && (draft.outLeft.trim() !== '' || draft.outRight.trim() !== '');
  const canCheck = ready && !missing && !vis.inputLocked && props.checksLeft > 0;
  const name = `twins-${q.id}`;

  const check = () => {
    if (!canCheck || draft.differs === null) return;
    const answer = { differs: draft.differs, outLeft: draft.outLeft, outRight: draft.outRight };
    const result = gradeTwins(q, answer, generated);
    setChecked({ answer, result });
    if (vis.testMode) setSubmitted(true);
    if (!draft.differsChecked) setDraft({ ...draft, differsChecked: true });
    props.onCheck(result, answer);
  };

  const set = (patch: Partial<TwinsDraft>) => {
    if (vis.inputLocked || (differsLocked && 'differs' in patch)) return;
    setDraft({ ...draft, ...patch });
  };

  // Parts to mark: from the last check while that part is unchanged; graded fresh once the answer is out.
  const fresh = vis.marks && vis.full && !missing && draft.differs !== null && (!checked || props.revealed)
    ? gradeTwins(q, { differs: draft.differs, outLeft: draft.outLeft, outRight: draft.outRight }, generated)
    : null;
  const eqOut = (a: string, b: string) => normalizeOutput(a) === normalizeOutput(b);
  const partMark = (part: keyof Parts): boolean | null => {
    if (!vis.marks) return null;
    if (fresh) {
      if (part === 'left' && draft.outLeft.trim() === '' && !checked) return null;
      if (part === 'right' && draft.outRight.trim() === '' && !checked) return null;
      return fresh.parts[part];
    }
    if (!checked) return null;
    const a = checked.answer;
    if (part === 'differs' && a.differs !== draft.differs) return null;
    if (part === 'left' && !eqOut(a.outLeft, draft.outLeft)) return null;
    if (part === 'right' && !eqOut(a.outRight, draft.outRight)) return null;
    return checked.result.parts[part];
  };
  const mDiffers = partMark('differs');
  const mLeft = partMark('left');
  const mRight = partMark('right');

  let status = null;
  const judged = fresh ?? (checked && vis.marks ? checked.result : null);
  if (!vis.testMode && judged && (fresh || (mDiffers !== null && mLeft !== null && mRight !== null))) {
    status = <Mark ok={judged.correct} />;
  }

  const showAnswer = vis.full && vis.marks && twins !== null;
  const yesNo = (value: boolean, label: string) => {
    const selected = draft.differs === value;
    const isRight = twins ? twins.differs === value : false;
    const markThis = selected && mDiffers !== null;
    const tone = markThis ? (mDiffers ? 'ok' : 'bad') : showAnswer && isRight ? 'ok' : '';
    const cls = ['rf-option', 'rf-yesno', selected ? 'selected' : '', differsLocked ? 'locked' : '', tone].filter(Boolean).join(' ');
    return (
      <div class={cls}>
        <label class="rf-option-main">
          <input type="radio" name={name} checked={selected} disabled={differsLocked} onChange={() => set({ differs: value })} />
          <span class="rf-option-body"><span class="rf-option-prose">{label}</span></span>
        </label>
        {markThis ? <div class="rf-option-mark"><Mark ok={!!mDiffers} label={mDiffers ? 'Your answer: correct' : 'Your answer: not quite'} /></div>
          : showAnswer && isRight ? <div class="rf-option-mark"><Mark ok label="Correct answer" /></div> : null}
      </div>
    );
  };

  return (
    <div class="rf rf-twins" onKeyDown={checkShortcut(check)}>
      <div class="rf-twins-grid">
        <Snippet id="A" code={q.left} lines={diff.left} />
        <Snippet id="B" code={q.right} lines={diff.right} />
      </div>
      {missing ? <MissingData /> : null}

      <fieldset class="rf-fieldset">
        <legend class="rf-legend">Step 1. Do A and B print the same thing?</legend>
        <div class="rf-options rf-yesno-row">
          {yesNo(false, 'Yes, the same')}
          {yesNo(true, 'No, they differ')}
        </div>
        {differsLocked && !vis.inputLocked ? <p class="rf-help">Step 1 can only be checked once, so your answer stays as it is.</p> : null}
      </fieldset>

      <fieldset class="rf-fieldset">
        <legend class="rf-legend">Step 2. What does each one print?</legend>
        <p class="rf-help">Type exactly what is printed, one line per print.</p>
        <div class="rf-twins-grid">
          <OutField id={`${name}-a`} label="A prints" value={draft.outLeft} mark={mLeft} readOnly={vis.inputLocked}
            onInput={(v) => set({ outLeft: v })} expected={showAnswer && twins ? normalizeForDisplay(twins.outLeft) : null} />
          <OutField id={`${name}-b`} label="B prints" value={draft.outRight} mark={mRight} readOnly={vis.inputLocked}
            onInput={(v) => set({ outRight: v })} expected={showAnswer && twins ? normalizeForDisplay(twins.outRight) : null} />
        </div>
      </fieldset>

      <CheckBar
        vis={vis} revealed={props.revealed} locked={props.locked} checksLeft={props.checksLeft}
        ready={ready} notReadyText={draft.differs === null ? 'Answer step 1 first.' : 'Type what A and B print first.'} missing={missing} submitted={submitted}
        onCheck={check} status={status}
      />
    </div>
  );
}

function Snippet({ id, code, lines }: { id: string; code: string; lines: number[] }) {
  return (
    <figure class="rf-snippet">
      <figcaption class="rf-snippet-head">
        <span class="rf-snippet-id" aria-hidden="true">{id}</span>
        <span class="sr-only">Snippet {id}</span>
        {lines.length ? <span class="rf-help">Differs on {linesPhrase(lines)}</span> : null}
      </figcaption>
      <CodeBlock code={code} numbered highlightLines={lines} class="rf-diff-code" label={`Snippet ${id}`} />
    </figure>
  );
}

function OutField(p: { id: string; label: string; value: string; mark: boolean | null; readOnly: boolean; onInput: (v: string) => void; expected: string | null }) {
  return (
    <div class="rf-field">
      <label class="rf-subhead" for={p.id}>{p.label}</label>
      <textarea
        id={p.id}
        class={['rf-textarea', p.mark === true ? 'ok' : p.mark === false ? 'bad' : ''].filter(Boolean).join(' ')}
        rows={Math.max(3, p.value.split('\n').length + 1)}
        value={p.value}
        readOnly={p.readOnly}
        ref={noAutocorrect} autocomplete="off" autocapitalize="off" spellcheck={false} wrap="off"
        onInput={(e) => p.onInput(e.currentTarget.value)}
      />
      {p.mark !== null ? <div class="rf-field-mark"><Mark ok={p.mark} /></div> : null}
      {p.expected !== null ? (
        <div class="rf-reveal">
          <div class="rf-subhead">Expected</div>
          <OutputBlock text={p.expected} label={`${p.label}: expected output`} />
        </div>
      ) : null}
    </div>
  );
}
