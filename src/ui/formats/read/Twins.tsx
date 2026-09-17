// Spot the difference: two near-identical snippets. Do they print the same thing, and what does each print?
import { useMemo, useState } from 'preact/hooks';
import type { FormatProps, GradeResult } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';
import { gradeTwins, normalizeOutput } from '../../../engine/grade.ts';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { Icon } from '../../components/Icon.tsx';
import { differingLines, isRecord, linesPhrase, normalizeForDisplay } from './logic.ts';
import { Ask, CheckBar, Choice, Label, Mark, MissingData, OutputBlock, ReadFrame, TerminalInput, useDraftState, visibility } from './shared.tsx';

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
  // Segment marks: the student's pick gets its result; once the answer is out the right one gets a tick.
  const segOk = (value: boolean): boolean | null => {
    if (draft.differs === value && mDiffers !== null) return mDiffers;
    if (showAnswer && twins && twins.differs === value) return true;
    return null;
  };
  const lockNoteId = `${name}-lock`;
  const outHelpId = `${name}-out-help`;

  return (
    <ReadFrame
      kind="twins" onCheck={check}
      bar={
        <CheckBar
          vis={vis} revealed={props.revealed} locked={props.locked} checksLeft={props.checksLeft}
          ready={ready} notReadyText={draft.differs === null ? 'Answer same or different first' : 'Type what A and B print first'} missing={missing} submitted={submitted}
          onCheck={check} status={status}
        />
      }
    >
      <div class="rf-pair">
        <Snippet id="A" code={q.left} lines={diff.left} />
        <Snippet id="B" code={q.right} lines={diff.right} />
      </div>
      {missing ? <MissingData /> : null}

      <fieldset class="rf-fieldset rf-same">
        <Ask mark={mDiffers}>Do A and B print the same thing?</Ask>
        <div class="rf-same-row">
          <Choice
            name={name} label="Do A and B print the same thing?" disabled={differsLocked}
            value={draft.differs === null ? null : draft.differs ? 'differ' : 'same'}
            onChange={(v) => set({ differs: v === 'differ' })}
            describedBy={differsLocked && !vis.inputLocked ? lockNoteId : undefined}
            options={[
              { value: 'same', label: 'Yes, the same', ok: segOk(false) },
              { value: 'differ', label: 'No, they differ', ok: segOk(true) },
            ]}
          />
          {differsLocked && !vis.inputLocked ? (
            <span class="rf-note" id={lockNoteId}><Icon name="lock" size={12} /> Locked after the first check</span>
          ) : null}
        </div>
      </fieldset>

      <fieldset class="rf-fieldset">
        <Ask>What does each one print?</Ask>
        <p class="sr-only" id={outHelpId}>Type exactly what is printed, one line per print.</p>
        <div class="rf-pair">
          <OutField id={`${name}-a`} label="A prints" value={draft.outLeft} mark={mLeft} readOnly={vis.inputLocked} describedBy={outHelpId}
            onInput={(v) => set({ outLeft: v })} expected={showAnswer && twins ? normalizeForDisplay(twins.outLeft) : null} />
          <OutField id={`${name}-b`} label="B prints" value={draft.outRight} mark={mRight} readOnly={vis.inputLocked} describedBy={outHelpId}
            onInput={(v) => set({ outRight: v })} expected={showAnswer && twins ? normalizeForDisplay(twins.outRight) : null} />
        </div>
      </fieldset>
    </ReadFrame>
  );
}

function Snippet({ id, code, lines }: { id: string; code: string; lines: number[] }) {
  return (
    <figure class="rf-snippet">
      <figcaption class="rf-label">
        <span class="rf-label-text">{id}</span>
        <span class="sr-only">Snippet {id}{lines.length ? `, differs on ${linesPhrase(lines)}` : ''}</span>
      </figcaption>
      <CodeBlock code={code} numbered highlightLines={lines} class="rf-hl-code" label={`Snippet ${id}`} />
    </figure>
  );
}

function OutField(p: { id: string; label: string; value: string; mark: boolean | null; readOnly: boolean; describedBy: string; onInput: (v: string) => void; expected: string | null }) {
  return (
    <div class="rf-field rf-out">
      <Label as="label" htmlFor={p.id} end={p.mark !== null ? <Mark ok={p.mark} /> : undefined}>{p.label}</Label>
      <TerminalInput id={p.id} value={p.value} readOnly={p.readOnly} mark={p.mark} minRows={2} describedBy={p.describedBy} onInput={p.onInput} />
      {p.expected !== null ? (
        <div class="rf-field rf-expected">
          <Label>Expected</Label>
          <OutputBlock text={p.expected} label={`${p.label}: expected output`} />
        </div>
      ) : null}
    </div>
  );
}
