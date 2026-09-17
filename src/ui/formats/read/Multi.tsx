// Select all that apply. Graded by the set of picked option ids.
import { useState } from 'preact/hooks';
import type { FormatProps, GradeResult } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';
import { gradeMulti } from '../../../engine/grade.ts';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { Markdown } from '../../components/Markdown.tsx';
import { asStringArray, isRecord } from './logic.ts';
import { CheckBar, Mark, OptionText, checkShortcut, useDraftState, visibility } from './shared.tsx';

type Q = QuestionOf<'multi'>;
interface MultiDraft { picks: string[] }

export function Multi(props: FormatProps<Q>) {
  return <MultiBody key={props.q.id} {...props} />;
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

function MultiBody(props: FormatProps<Q>) {
  const { q } = props;
  const ids = q.options.map((o) => o.id);
  const [draft, setDraft] = useDraftState<MultiDraft>(
    props.draft, props.onDraft,
    (d) => {
      const picks = isRecord(d) ? asStringArray(d.picks) : null;
      return picks ? { picks: ids.filter((id) => picks.includes(id)) } : null;
    },
    () => ({ picks: [] }),
  );
  const [checked, setChecked] = useState<{ picks: string[]; result: GradeResult } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const vis = visibility(props, checked !== null, submitted);
  const picks = draft.picks;
  const ready = picks.length > 0;
  const canCheck = ready && !vis.inputLocked && props.checksLeft > 0;

  const check = () => {
    if (!canCheck) return;
    const result = gradeMulti(q, picks);
    setChecked({ picks: picks.slice(), result });
    if (vis.testMode) setSubmitted(true);
    props.onCheck(result, { picks: picks.slice() });
  };

  const toggle = (id: string) => {
    if (vis.inputLocked) return;
    const next = picks.includes(id) ? picks.filter((x) => x !== id) : ids.filter((x) => x === id || picks.includes(x));
    setDraft({ picks: next });
  };

  // Per-option marks only once the answer is out (otherwise they would give the answer away).
  const markPicks = vis.full && vis.marks ? (checked?.picks ?? picks) : null;
  const stillChecked = checked !== null && sameSet(checked.picks, picks);
  let status = null;
  if (!vis.testMode && checked && (vis.full || stillChecked)) {
    const r = checked.result;
    status = <span class="rf-status-line"><Mark ok={r.correct} />{!r.correct && r.score > 0 ? <span class="muted"> Partly right.</span> : null}</span>;
  }

  return (
    <div class="rf rf-multi" onKeyDown={checkShortcut(check)}>
      {q.code ? <CodeBlock code={q.code} numbered label="Code for this question" /> : null}
      <fieldset class="rf-fieldset">
        <legend class="rf-legend">Select all that apply</legend>
        <div class="rf-options">
          {q.options.map((o) => {
            const selected = picks.includes(o.id);
            let mark = null;
            let tone = '';
            if (markPicks) {
              const picked = markPicks.includes(o.id);
              if (picked && o.correct) { mark = <Mark ok label="You picked it: correct" />; tone = 'ok'; }
              else if (picked) { mark = <Mark ok={false} label="You picked it: should be left out" />; tone = 'bad'; }
              else if (o.correct) { mark = <Mark ok={false} label="Missed: this one should be picked" />; tone = 'bad'; }
              else { mark = <Mark ok label="Left out: correct" />; }
            }
            const cls = ['rf-option', selected ? 'selected' : '', vis.inputLocked ? 'locked' : '', tone].filter(Boolean).join(' ');
            return (
              <div class={cls} key={o.id}>
                <label class="rf-option-main">
                  <input type="checkbox" value={o.id} checked={selected} disabled={vis.inputLocked} onChange={() => toggle(o.id)} />
                  <span class="rf-option-body"><OptionText text={o.text} /></span>
                </label>
                {mark ? <div class="rf-option-mark">{mark}</div> : null}
                {markPicks && o.why ? <div class="rf-why"><Markdown text={o.why} /></div> : null}
              </div>
            );
          })}
        </div>
      </fieldset>
      <CheckBar
        vis={vis} revealed={props.revealed} locked={props.locked} checksLeft={props.checksLeft}
        ready={ready} notReadyText="Tick at least one option first." missing={false} submitted={submitted}
        onCheck={check} status={status}
      />
    </div>
  );
}
