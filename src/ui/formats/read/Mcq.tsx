// Multiple choice (and true/false with two options). Graded by option id.
import { useRef, useState } from 'preact/hooks';
import type { FormatProps, GradeResult } from '../../../engine/types.ts';
import type { McqOption, QuestionOf } from '../../../content/schema.ts';
import { gradeMcq } from '../../../engine/grade.ts';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Markdown } from '../../components/Markdown.tsx';
import { isRecord } from './logic.ts';
import { CheckBar, Mark, OptionText, checkShortcut, useDraftState, useNumberKeys, useSingleKeysOn, visibility } from './shared.tsx';

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

  let status = null;
  if (!vis.testMode && checked && markedChoice === checked.choice) status = <Mark ok={checked.choice === correctId} />;

  return (
    <div class="rf rf-mcq" ref={rootRef} onKeyDown={checkShortcut(check)}>
      {q.code ? <CodeBlock code={q.code} numbered label="Code for this question" /> : null}
      <fieldset class="rf-fieldset">
        <legend class="sr-only">Choose one answer</legend>
        <div class="rf-options" role="presentation">
          {q.options.map((o, i) => (
            <OptionCard
              key={o.id} o={o} index={i} name={name}
              selected={choice === o.id}
              disabled={vis.inputLocked}
              onPick={() => pick(o.id)}
              onEnter={check}
              isCorrect={o.id === correctId}
              showCorrect={vis.full && vis.marks}
              isMarkedChoice={markedChoice === o.id}
              showKey={keysOn && !vis.inputLocked && i < 5}
              showOthersWhy={props.revealed && vis.marks}
            />
          ))}
        </div>
      </fieldset>
      <CheckBar
        vis={vis} revealed={props.revealed} locked={props.locked} checksLeft={props.checksLeft}
        ready={ready} notReadyText="Pick an answer first." missing={false} submitted={submitted}
        onCheck={check} status={status}
      />
    </div>
  );
}

function OptionCard(p: {
  o: McqOption; index: number; name: string; selected: boolean; disabled: boolean;
  onPick: () => void; onEnter: () => void;
  isCorrect: boolean; showCorrect: boolean; isMarkedChoice: boolean; showOthersWhy: boolean; showKey: boolean;
}) {
  const { o } = p;
  const markCorrect = p.showCorrect && p.isCorrect;
  const markChosen = p.isMarkedChoice;
  let mark = null;
  if (markChosen && p.isCorrect) mark = <Mark ok label="Your answer: correct" />;
  else if (markChosen) mark = <Mark ok={false} label="Your answer: not quite" />;
  else if (markCorrect) mark = <Mark ok label="Correct answer" />;
  const showWhy = markChosen || markCorrect;
  const tone = markChosen ? (p.isCorrect ? 'ok' : 'bad') : markCorrect ? 'ok' : '';
  const cls = ['rf-option', p.selected ? 'selected' : '', p.disabled ? 'locked' : '', tone].filter(Boolean).join(' ');
  return (
    <div class={cls}>
      <label class="rf-option-main">
        <input
          type="radio" name={p.name} value={o.id} checked={p.selected} disabled={p.disabled}
          onChange={p.onPick}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); p.onEnter(); } }}
        />
        {p.showKey ? <span class="rf-option-key" aria-hidden="true">{p.index + 1}</span> : null}
        <span class="rf-option-body"><OptionText text={o.text} /></span>
      </label>
      {mark ? <div class="rf-option-mark">{mark}</div> : null}
      {showWhy && o.why ? <div class="rf-why"><Markdown text={o.why} /></div> : null}
      {!showWhy && p.showOthersWhy && o.why ? (
        <details class="rf-why-more">
          <summary><Icon name="chevronRight" size={14} class="rf-why-chevron" />Why not this one</summary>
          <Markdown text={o.why} />
        </details>
      ) : null}
    </div>
  );
}
